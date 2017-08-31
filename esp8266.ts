/**
 * Functions for the ESP8266 Wifi module.
 *
 * @author Matthias L. Jugel
 */

enum MessageType {
    UDP,
    TCP
}

//% weight=2 color=#1174EE icon="\uf1eb" block="ESP8266"
//% parts="esp8266"
namespace esp8266 {
    import logArray = modem.logArray;
    let SERVER: string = null;
    let PORT = 9090;
    let ENCRYPTED = false;
    let ERROR = false;

    /**
     * Initialize ESP8266 module. The serial port and generic settings.
     * First connects to the module, using 9600 baud, 8N1 and sets explicit
     * target settings and resets the module.
     * @param tx the new transmission pins, eg: SerialPin.C17
     * @param rx the new reception pin, eg: SerialPin.C16
     * @param rate the new baud rate, eg: BaudRate.BaudRate115200
     */
    //% weight=210
    //% blockId=esp8266_init block="initialize ESP8266|TX %tx|RX %rx|at baud rate %rate"
    //% blockExternalInputs=1
    //% parts="esp8266"
    export function init(tx: SerialPin, rx: SerialPin, rate: BaudRate): void {
        modem.init(tx, rx, BaudRate.BaudRate9600);
        // switch to 115200, 8N1 and reset, just to be sure
        modem.pushAT("+UART=115200,8,1,0,0");
        modem.pushAT("+RST");
        basic.pause(1500);

        modem.init(tx, rx, rate);
        // allocate as much memory as possible, or we will lose data
        serial.setReceiveBufferSize(254);

        // clear buffer
        serial.readString();
        modem.expectOK("E0");
    }

    /**
     * Connect to the wifi network.
     */
    //% weight=209
    //% blockId=esp8266_attach block="connect to the wifi network|SSID %ssid|password %password"
    //% blockExternalInputs=1
    //% parts="esp8266"
    export function attach(ssid: string, password: string): void {
        if(modem.expectOK("+CWMODE=1")) {
            modem.pushAT("+CWJAP=\""+ssid+"\",\""+password+"\"");
            modem.receiveResponse((line: string) => {
                //modem.log("~~~", line+": "+line.compare("OK"));
                return line.compare("OK") == 0 || line.compare("ERROR") == 0 || line.compare("FAIL") == 0;
            });
        }
    }

    /**
     * Check if we are attached to the wifi network.
     */
    //% weight=209
    //% blockId=esp8266_isattached block="network attached?"
    //% parts="esp8266"
    export function isAttached(ssid: string = null): boolean {
        let r = modem.sendAT("+CWJAP?");
        return r.length >= 2 && r[r.length-2].compare("No AP") != 0 && r[r.length-1].compare("OK") == 0;

    }

    /**
     * Disconnect from the wifi network.
     */
    //% weight=209
    //% blockId=esp8266_detach block="disconnect from wifi network"
    //% parts="esp8266"
    export function detach(): void {
        modem.expectOK("+CWQAP")
    }

    /**
     * Send a message via wifi.
     * @param {string} type send as TCP or UDP, eg: MessageType.TCP
     * @param {string} address the server address
     * @param {number} port the server port to send to, eg: 8080
     * @param {string} message the actual data to send
     */
    //% weight=70
    //% blockId=esp8266_send block="send raw message|type %type|server %address|port %port|message %message"
    //% blockExternalInputs=1
    //% parts="esp8266"
    //% advanced=true
    export function send(type: MessageType, address: string, port: number, message: string): void {
        ERROR = true;
        let messageType = "";
        switch(type) {
            case MessageType.TCP: messageType = "TCP"; break;
            case MessageType.UDP: messageType = "UDP"; break;
            default: messageType = "TCP";
        }
        if(modem.expectOK("+CIPMODE=0")) {
            if (modem.expectOK("+CIPSTART=\""+messageType+"\",\"" + address + "\"," + port)) {
                modem.pushAT("+CIPSEND=" + message.length);
                serial.read(">");
                serial.writeString(message);
                modem.receiveResponse((line: string) => {
                    // should be line == "SEND OK", but the simulator breaks, as serial.read() only returns OK
                    return line.substr(line.length-2, 2).compare("OK") == 0;
                });
                ERROR = !modem.expectOK("+CIPCLOSE");
            }
        }
    }


    /**
     * Configure the server to use for the NB-IoT messaging.
     * @param host the IP address of a server to send messages to
     * @param port the port to send messages to, eg: 9090
     */
    //% weight=80
    //% blockId=esp8266_setserver block="set server |address %host|port %port"
    //% parts="esp8266"
    export function setServer(host: string, port: number): void {
        SERVER = host;
        PORT = port;
    }

    /**
     * Send a number to the backend server. Encodes key/value as a json message.
     */
    //% weight=60
    //% blockId=esp8266_sendNumber block="send number message|key %key|value %n"
    //% blockExternalInputs=1
    //% parts="esp8266"
    export function sendNumber(key: string, value: number): void {
        sendEncoded("{\"" + key + "\":" + value + "}");
    }

    /**
     * Send a string to the backend server. Encodes key/value as a json message.
     */
    //% weight=60
    //% blockId=esp8266_sendString block="send string message|key %key|value %n"
    //% blockExternalInputs=1
    //% parts="esp8266"
    export function sendString(key: string, value: string): void {
        sendEncoded("{\"" + key + "\":\"" + value + "\"}");
    }

    /**
     * Send the actual message, encoded. Data is encoded in message pack format:
     * INT[DeviceId]BYTES[Message]. The maximum message size is 504 bytes.
     * If messages are encrypted, the key is 16 bytes: [SECRET,ID,SECRET,ID].
     * @param message the message to send
     */
    //% weight=55
    //% blockId=esp8266_sendEncoded block="send encoded message|message %message"
    //% advanced=true
    //% parts="esp8266"
    export function sendEncoded(message: string): void {
        ERROR = true;
        if (SERVER != null && SERVER.length > 0) {
            if (modem.expectOK("+CIPMODE=0")) {
                let packetLength = 0;

                let encoded = "";
                if (message.length < 32) {
                    // messages shorter than 32 bytes will have a single 0xA0 + length marker byte
                    packetLength = message.length + 1;
                    encoded = String.fromCharCode(0xA0 + message.length);
                } else if (message.length < 256) {
                    // messages shorter than 255 bytes have two bytes as marker: 0xd9 and length
                    packetLength = message.length + 2;
                    encoded += String.fromCharCode(0xD9) + String.fromCharCode(message.length);
                } else if (message.length < 505) {
                    // messages shorter than 255 bytes have two bytes as marker: 0xd9 and a two byte length
                    packetLength = message.length + 3;
                    encoded += String.fromCharCode(0xD9) + String.fromCharCode(message.length >> 8) + String.fromCharCode(message.length & 0xff);
                } else {
                    // the module only supports a maximum payload of 512 bytes!
                    return;
                }
                // add actual message
                encoded += message;

                // encrypt message, if needed, padding w/ 0x80 and zeros
                if (ENCRYPTED) {
                    encoded = encrypt(encoded + String.fromCharCode(0x80));
                    packetLength = encoded.length;
                }

                // encode the package in messagepack format
                let header = String.fromCharCode(0xCE) + numberToString(getDeviceId(1));
                packetLength += 5;

                if (modem.expectOK("+CIPSTART=\"UDP\",\"" + SERVER + "\"," + PORT)) {
                    modem.pushAT("+CIPSEND=" + packetLength);
                    serial.read(">");
                    serial.writeString(header + encoded);
                    modem.receiveResponse((line: string) => {
                        // should be line == "SEND OK", but the simulator breaks, as serial.read() only returns OK
                        return line.substr(line.length-2, 2).compare("OK") == 0;
                    });
                }
                ERROR = !modem.expectOK("+CIPCLOSE");
            }

        }
    }

    /**
     * Check if the last send operation was successful.
     * Also reset the status.
     */
    //% weight=70
    //% blockId=esp8266_sendOk block="send success?"
    //% parts="esp8266"
    export function sendOk(): boolean {
        if (ERROR) {
            ERROR = false;
            return false;
        } else return true;
    }

    /**
     * Show Calliope device id and the secret for communication.
     */
    //% blockId=esp8266_showdeviceinfo block="show device Info|on display %onDisplay"
    //% parts="esp8266"
    //% advanced=true
    export function showDeviceInfo(onDisplay: boolean = true): void {
        let deviceId = numberToHex(getDeviceId(1));
        let deviceSecret = numberToHex(getDeviceId(0));
        modem.log("ID", deviceId);
        modem.log("SECRET", deviceSecret);
        if (onDisplay) basic.showString("id:" + deviceId + " secret:" + deviceSecret, 250);
    }

    /**
     * Set encryption mode. Whether data should be AES encrypted. See #showDeviceInfo
     * how to identify the device ID and secret.
     * ATTENTION: Only works if BLUETOOTH is enabled!
     * @param encrypted whether the data should be encrypted, eg: false
     */
    //% weight=20
    //% blockId=esp8266_setencrypted block="encrypt messages %encrypted"
    //% advanced=true
    //% parts="esp8266"
    export function setEncryption(encrypted: boolean = false) {
        ENCRYPTED = encrypted;
    }

    // converts a number into a readable hex-string representation
    function numberToHex(n: number): string {
        return stringToHex(numberToString(n));
    }

    // converts a number into a binary string representation
    function numberToString(n: number): string {
        return String.fromCharCode((n >> 24) & 0xff) +
            String.fromCharCode((n >> 16) & 0xff) +
            String.fromCharCode((n >> 8) & 0xff) +
            String.fromCharCode(n & 0xff);
    }

    // helper function to convert a string into a hex representation usable by the module
    export function stringToHex(s: string): string {
        const l = "0123456789ABCDEF";
        let r = "";
        for (let i = 0; i < s.length; i++) {
            let c = s.charCodeAt(i);
            r = r + l.substr((c >> 4), 1) + l.substr((c & 0x0f), 1);
        }
        return r;
    }

    //% shim=esp8266::getDeviceId
    export function getDeviceId(n: number): number {
        // dummy value for the simulator
        return 0;
    }

    //% shim=esp8266::encrypt
    export function encrypt(data: string): string {
        // dummy return
        return "???";
    }
}

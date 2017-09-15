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
}

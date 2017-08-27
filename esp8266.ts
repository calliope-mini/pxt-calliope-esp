/**
 * Functions for the ESP8266 Wifi module.
 *
 * @author Matthias L. Jugel
 */

//% weight=2 color=#1174EE icon="\uf1eb"
//% parts="ESP8266    
namespace esp8266 {
    /**
     * Initialize ESP8266 module. The serial port and generic settings.
     * @param tx the new transmission pins, eg: SerialPin.C17
     * @param rx the new reception pin, eg: SerialPin.C16
     * @param rate the new baud rate, eg: BaudRate.BaudRate115200
     */
    //% weight=210
    //% blockId=ESP8266_init block="initialize ESP8266|TX %tx|RX %rx|at baud rate %rate"
    //% blockExternalInputs=1
    //% parts="esp8266"
    export function init(tx: SerialPin, rx: SerialPin, rate: BaudRate): void {
        modem.init(tx, rx, rate);
        // allocate as much memory as possible, or we will lose data
        serial.setReceiveBufferSize(254);

        // switch to 115200, 8N1 and reset, just to be sure
        modem.pushAT("+UART=115200,8,1,0,0");
        modem.pushAT("+RST");
        basic.pause(1500);
    }

    /**
     * Connect to the wifi network.
     */
    //% weight=209
    //% blockId=ESP8266_attach block="connect to the wifi network"
    //% parts="esp8266"
    export function attach(ssid: string, password: string): void {
        if(modem.expectOK("+CWMODE=1")) {
            modem.pushAT("+CWJAP=\""+ssid+"\",\""+password+"\"");
            let r = modem.receiveResponse((line: string) => {
                return line == "OK" || line == "ERROR" || line.substr(0, 7) == "+CWJAP:";
            });
        }
    }

    /**
     * Disconnect from the wifi network.
     */
    //% weight=209
    //% blockId=ESP8266_detach block="disconnect from wifi network"
    //% parts="esp8266"
    export function detach(): void {
        modem.expectOK("+CWQAP")
    }

    export function sendTCP(address: string, port: number, message: string): void {
        modem.expectOK("+CIPMODE=0");
        modem.expectOK("+CIPSTART=\"TCP\",\""+address+"\","+port);
        modem.pushAT("+CIPSEND="+message.length);
        serial.read(">");
        serial.writeString(message);
        r = modem.receiveResponse((line: string) => {
            return line == "SEND OK";
        });
        modem.expectOK("+CIPCLOSE");
    }


    export function sendUDP(address: string, port: number, message: string): void {
        modem.expectOK("+CIPMODE=0");
        modem.expectOK("+CIPSTART=\"UDP\",\""+address+"\","+port);
        modem.pushAT("+CIPSEND="+message.length);
        serial.read(">");
        serial.writeString(message);
        r = modem.receiveResponse((line: string) => {
            return line == "SEND OK";
        });
        modem.expectOK("+CIPCLOSE");
    }
}

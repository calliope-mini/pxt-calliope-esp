/**
 * Modem functionality to send and received AT commands and responses.
 *
 * @author Matthias L. Jugel
 */
//% weight=2 color=#f2c10d icon="\uf0ec"
//% advanced=true
//% parts="modem
namespace modem {
    // keep the serial port settings for logging
    let TX = SerialPin.C17;
    let RX = SerialPin.C16;
    let BAUD = BaudRate.BaudRate9600;

    // enabling DEBUG allows to follow the AT flow on the USB serial port
    // this switches the serial back and forth and introduces delays
    let DEBUG = false;

    /**
     * Initialize the modem with the corresponding serial pins and baud rate.
     * @param {SerialPin} tx the modem transmission pins, eg: SerialPin.C17
     * @param {SerialPin} rx the modem reception pin, eg: SerialPin.C16
     * @param {BaudRate} rate the new baud rate, eg: BaudRate.BaudRate9600
     */
    //% weight=100
    //% blockId=modem_init block="initialize Modem|TX %tx|RX %rx|at baud rate %rate"
    //% blockExternalInputs=1
    //% parts="modem"
    export function init(tx: SerialPin, rx: SerialPin, rate: BaudRate): void {
        // initialize serial port
        TX = tx;
        RX = rx;
        BAUD = rate;
        serial.redirect(TX, RX, BAUD);
        serial.setReceiveBufferSize(100);
    }

    /**
     * Send an AT command to the modem module. Just provide the actual
     * command, not the AT prefix, like this AT("+CGMI?"). Ignores the
     * AT command response completely
     * @param command the command to be sent without AT prefix
     */
    //% weight=80
    //% blockId=modem_pushat block="send AT %command"
    //% parts="modem"
    export function pushAT(command: string): void {
        if (DEBUG) log("+++", "AT" + command);
        serial.writeString("AT" + command + "\r\n");
    }

    /**
     * Send an AT command and expect either OK or ERROR response.
     * Returns all response lines.
     * @param {string} command the command to send without AT prefix
     * @returns {Array<string>} an array of lines received
     */
    //% weight=80
    //% blockId=modem_sendat block="send AT %command and receive"
    //% parts="modem"
    export function sendAT(command: string): Array<string> {
        basic.pause(100);
        if (DEBUG) log("+++", "AT" + command);
        serial.writeString("AT" + command + "\r\n");
        return receiveResponse((line: string) => {
            return line == "OK" || line == "ERROR";
        });
    }

    /**
     * Wait for a response from the modem and collect all lines until the
     * condition returns true. Returns all received lines.
     * @param {(line: string) => boolean} cond
     * @returns {Array<string>} an array of lines received
     */
    //% weight=10
    //% blockId=modem_receiveresponse block="wait for response %cond"
    //% parts="modem"
    export function receiveResponse(cond: (line: string) => boolean): Array<string> {
        let line = "";
        let received: Array<string> = [];
        do {
            line = serial.read("\r\n");
            if (line.length > 0) received.push(line);
        } while (line.length == 0 || !cond(line));
        if (DEBUG) logArray("---", received);
        return received;
    }

    /**
     * Send an AT command to the modem module and expect OK. Just provide the actual
     * command, not the AT prefix, like this AT("+CGMI?"). This function
     * only returns whether the command was executed successful or not.
     * @param command the command to be sent without AT prefix
     */
    //% weight=80
    //% blockId=modem_expectok block="check AT %command|response OK?"
    //% parts="modem"
    export function expectOK(command: string): boolean {
        let response = sendAT(command);
        return response[response.length - 1] == "OK";
    }

    /**
     * Enable AT command debug.
     */
    //% weight=1
    //% blockId=modem_setDEBUG block="enable DEBUG %debug"
    //% parts="modem"
    export function enableDebug(debug: boolean = false): void {
        DEBUG = debug;
    }

    /**
     * Log a message to the USB console log.
     * @param {string} prefix a prefix to be prepended to the line
     * @param {string} message the message to log
     */
    export function log(prefix: string, message: string): void {
        if(TX == null) return;
        basic.pause(100);
        serial.resetSerial();
        serial.writeLine(prefix + " " + message);
        while (serial.busy()) basic.pause(10);
        serial.redirect(TX, RX, BAUD);
        basic.pause(100);
    }

    /**
     * Log an array of messages to the USB console log.
     * @param {string} prefix a prefix to be prepended to the line
     * @param {string} messages the messages to log to the console
     */
    export function logArray(prefix: string, messages: Array<string>): void {
        if(TX == null) return;
        basic.pause(100);
        serial.resetSerial();
        for (let i = 0; i < messages.length; i++) {
            serial.writeLine(prefix + " (" + messages[i].length + ") " + messages[i]);
        }
        while (serial.busy()) basic.pause(10);
        serial.redirect(TX, RX, BAUD);
        basic.pause(100);
    }
}
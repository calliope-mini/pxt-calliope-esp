// this test runs on the device, connect and it will send the output on serial
// after everything is done
// run pxt test & copy build/binary.hex to MINI drive

const SSID = "TEST";
const PASSWORD = "TEST1234";
const SERVER = "46.23.86.61";
const PORT = 9090; // UDP port is 9091 (+1)
const MESSAGE = "{\"test\":123456}";

// loop until button A is kept pressed
const LOOP = true;
// log AT commands to USB console
const DEBUG_AT = false;

//% shim=pxtrt::panic
function panic(code2: number): void {
}

function assert(msg: string, cond: boolean) {
    if (!cond) {
        modem.log("ASSERT:", msg + " failed");
        panic(45);
    } else {
        modem.log("TEST:", msg + ": OK");
    }
}

console.log("TEST START");

modem.enableDebug(DEBUG_AT);
esp8266.init(SerialPin.C17, SerialPin.C16, BaudRate.BaudRate115200);

// check modem status
assert("modem working", modem.expectOK(""));
assert("disable echo", modem.expectOK("E0"));
let gmr = modem.sendAT("+GMR");
assert("modem identification", gmr.length == 4 && gmr[gmr.length-1] == "OK");
assert("AT version is 0.21.0.0", gmr[0] == "AT version:1.3.0.0(Jul 14 2016 18:54:01)");
assert("SDK version is 0.9.5", gmr[1] == "SDK version:2.0.0(656edbf)");

// attach to the wifi network
assert("wifi set mode", modem.expectOK("+CWMODE=1"));
assert("wifi mode", modem.sendAT("+CWMODE?")[0] == "+CWMODE:1");
modem.pushAT("+CWJAP=\""+SSID+"\",\""+PASSWORD+"\"");
let r = modem.receiveResponse((line: string) => {
    return line == "OK" || line == "ERROR" || line.substr(0, 7) == "+CWJAP:";
});
assert("wifi connect", r[r.length-2] == "WIFI GOT IP");

// send a packet
assert("ip mode", modem.expectOK("+CIPMODE=0"));
assert("ip connect", modem.expectOK("+CIPSTART=\"TCP\",\""+SERVER+"\","+PORT));
modem.pushAT("+CIPSEND="+MESSAGE.length);
serial.read(">");
serial.writeString(MESSAGE);
r = modem.receiveResponse((line: string) => {
    return line == "SEND OK";
});
modem.logArray(">>>", r);

// check status, disconnect and detach
assert("ip status", modem.expectOK("+CIPSTATUS"));
assert("ip close", modem.expectOK("+CIPCLOSE"));
assert("wifi disconnect", modem.expectOK("+CWQAP"));

// do some module testing, using the high level functions

esp8266.attach("foo", "01234567");
assert("network not found", !esp8266.isAttached());

esp8266.attach(SSID, PASSWORD);
assert("network attach", esp8266.isAttached());
esp8266.sendTCP(SERVER, PORT, MESSAGE);
assert("TCP send", esp8266.sendOk());
esp8266.sendUDP(SERVER, PORT+1, MESSAGE);
assert("UDP send", esp8266.sendOk());

esp8266.detach();

serial.resetSerial();

console.log("TEST FINISHED OK");

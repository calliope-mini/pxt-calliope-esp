// this test runs on the device, connect and it will send the output on serial
// after everything is done

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

esp8266.init(SerialPin.C17, SerialPin.C16, BaudRate.BaudRate9600);
modem.pushAT("+UART=115200,8,1,0,0");
modem.pushAT("+RST");
basic.pause(1500);

modem.enableDebug(true);
esp8266.init(SerialPin.C17, SerialPin.C16, BaudRate.BaudRate115200);
assert("modem working", modem.expectOK(""));
assert("disable echo", modem.expectOK("E0"));
let gmr = modem.sendAT("+GMR");
assert("modem identification", gmr.length == 4 && gmr[gmr.length-1] == "OK");
assert("AT version is 0.21.0.0", gmr[0] == "AT version:1.3.0.0(Jul 14 2016 18:54:01)");
assert("SDK version is 0.9.5", gmr[1] == "SDK version:2.0.0(656edbf)");

assert("wifi set mode", modem.expectOK("+CWMODE=1"));
assert("wifi mode", modem.sendAT("+CWMODE?")[0] == "+CWMODE:1");
modem.sendAT("+CWLAP");
modem.pushAT("+CWJAP=\"TEST\",\"TEST1234\"");
let r = modem.receiveResponse((line: string) => {
    return line == "OK" || line == "ERROR" || line.substr(0, 7) == "+CWJAP:";
});

assert("wifi connect", r[r.length-2] == "WIFI GOT IP");
assert("ip mode", modem.expectOK("+CIPMODE=0"));
assert("ip connect", modem.expectOK("+CIPSTART=\"TCP\",\"46.23.86.61\",9090"));

let message = "{\"test\":123456}";
modem.pushAT("+CIPSEND="+message.length);
serial.read(">");
serial.writeString(message);
r = modem.receiveResponse((line: string) => {
    return line == "SEND OK";
});
modem.logArray(">>>", r);

assert("ip status", modem.expectOK("+CIPSTATUS"));
assert("ip close", modem.expectOK("+CIPCLOSE"));

assert("wifi disconnect", modem.expectOK("+CWQAP"));

serial.resetSerial();

console.log("TEST FINISHED OK");

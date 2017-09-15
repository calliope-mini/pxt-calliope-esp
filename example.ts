modem.enableDebug(true)
esp8266.init(
    SerialPin.C17,
    SerialPin.C16,
    BaudRate.BaudRate115200
)
esp8266.attach(
    "ubirch",
    "mypassword"
)
esp8266.send(
    MessageType.UDP,
    "46.23.86.61",
    9090,
    "HELLO WE ARE CONNECTED!"
)
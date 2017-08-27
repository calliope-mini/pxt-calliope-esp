#include "pxt.h"

namespace serial {
    //%
    void setReceiveBufferSize(int size) {
        // make sure we only allocate 255 bytes or the device will freeze
        uBit.serial.setRxBufferSize(size < 255 ? size : 254);
    }

    //%
    bool busy() {
        return uBit.serial.txInUse();
    }

    //%
    void resetSerial() {
        while(uBit.serial.redirect(USBTX, USBRX) == MICROBIT_SERIAL_IN_USE) fiber_sleep(10);
        uBit.serial.baud(MICROBIT_SERIAL_DEFAULT_BAUD_RATE);
    }

    //%
    StringData *read(StringData *delimiters) {
        return uBit.serial.readUntil(ManagedString(delimiters), MicroBitSerialMode::SYNC_SPINWAIT).leakData();
    }
}

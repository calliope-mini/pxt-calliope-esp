/**
 * Extensions to the serial module.
 *
 * @author Matthias L. Jugel
 */
namespace serial {
    /**
     * Set serial receive buffer size.
     * @param size the new size of the receive buffer, eg: 20
     */
    //% blockId=serial_buffersize block="serial receive buffer size %size"
    //% shim=serial::setReceiveBufferSize
    export function setReceiveBufferSize(size: number): void {
        return;
    }

    /**
     * Reset serial back to USBTX/USBRX.
     */
    //% blockId=serial_resetserial block="serial reset"
    //% shim=serial::resetSerial
    export function resetSerial(): void {
        return;
    }

    //% shim=serial::read
    export function read(delimiters: string): string {
        return "OK";
    }

    //% shim=serial::busy
    export function busy(): boolean {
        return false;
    }

}
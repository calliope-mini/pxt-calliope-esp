#include "pxt.h"
extern "C" {
#include <nrf_soc.h>
}

namespace esp8266 {
    //%
    uint32_t getDeviceId(int n) {
        return NRF_FICR->DEVICEID[n < 0 || n > 3 ? 0 : n];
    }

    //%
    StringData *encrypt(StringData *cleartext) {
        if(!uBit.ble) return ManagedString().leakData();

        nrf_ecb_hal_data_t ecb_hal_data = {};
        memset(&ecb_hal_data, 0, sizeof(ecb_hal_data));
        memcpy(ecb_hal_data.key, (const uint8_t *) &NRF_FICR->DEVICEID, 8);
        memcpy(ecb_hal_data.key + 8, (const uint8_t *) &NRF_FICR->DEVICEID, 8);

        StringData *buffer;
        buffer = (StringData *) malloc(4 + (cleartext->len / 16 + 1) * 16 + 1);
        buffer->len = 0;
        buffer->init();

        for (unsigned int i = 0; i < cleartext->len; i += 16) {
            memset(ecb_hal_data.cleartext, 0, 16);
            memset(ecb_hal_data.ciphertext, 0, 16);

            strncpy((char *) ecb_hal_data.cleartext, cleartext->data + i, 16);
            if (sd_ecb_block_encrypt(&ecb_hal_data) != NRF_SUCCESS) {
                buffer->decr();
                return ManagedString().leakData();
            } else {
                memcpy(&buffer->data[i], ecb_hal_data.ciphertext, 16);
                buffer->len = buffer->len + 16;
            }
        }

        return buffer;
    }
}

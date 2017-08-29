# Script to test the message pack messages
# Unpacks the message pack data and decrypts it if a secret is given
#
# @author Matthias L. Jugel

from Crypto.Cipher import AES
import msgpack
import sys

# provide the message as the first argument
message = "cebc9ab239ac7b226c69676874223a35307d"
if len(sys.argv) > 1:
    message = sys.argv[1]

# if necessary provide key as second argument
secret = None
if len(sys.argv) > 2:
    secret = sys.argv[2]

if secret is not None:
    # decode from hex representation
    cipher = AES.new(secret.decode("hex"), AES.MODE_ECB, "")
    # remove the first five bytes (key)
    data = message.decode("hex")[5:]
    # decrypt AES128 ECB
    r = b''
    for i in [0, 16]:
        r += cipher.decrypt(data[i:i+16])
    # unpack first element (ignore rest, which is padding)
    unpacker = msgpack.Unpacker()
    unpacker.feed(r)
    print unpacker.next()
else:
    data = message.decode("hex")
    # unpack first element (ignore rest, which is padding)
    unpacker = msgpack.Unpacker()
    unpacker.feed(data)
    print "KEY : "+str(unpacker.next())
    print "DATA: "+unpacker.next()

#! /usr/bin/python3.7

import numpy as np
import cv2
import struct

VERSON = "1.0.0"

jpeg = None
try:
    from turbojpeg import TurboJPEG
    jpeg = TurboJPEG()
except:
    jpeg = None


def Image2Array(img):
    np_arr = np.frombuffer(img, dtype=np.uint8)
    if jpeg is None:
        img_np = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    else:
        img_np = jpeg.decode(np_arr)
    return img_np

def Array2Tensor(img_np):
    if img_np.dtype == np.dtype('double'):
        tensor_values = img_np.tobytes()
    else:
        tensor_values = img_np.astype('double').tobytes()

    tensor_size = len(tensor_values)
    tensor_dims = []
    tensor_dims.extend(img_np.shape)

    # Tensor Blob Structure
    # | SIGNATURE | VERSION | Tensor Type |  N_DIMS  |       DIMS       | Tensor Values |
    # | 3 bytes   |  1 byte | 4 bytes     |  8 bytes | N_DIMS * 8 bytes |      ...      |
    meta_format = "3s B I q %dq" % len(tensor_dims)

    sig=b"TEN"
    version = 0
    tensor_type = 0
    tensor_meta = struct.pack(meta_format, sig, version, tensor_type, len(tensor_dims), *tensor_dims)

    return b''.join([tensor_meta, tensor_values])

def Tensor2Array(tensor):
    sig, version, tensor_type, n_dims = struct.unpack_from("3s B I q", tensor)

    offset = struct.calcsize("3s B I q")
    tensor_dims = np.frombuffer(tensor, dtype=np.int64, count=n_dims, offset=offset)

    offset += 8 * n_dims
    tensor_values = np.frombuffer(tensor, dtype=np.float64, offset=offset)

    return tensor_values, tensor_dims

#!/usr/bin/env python
# encoding: utf-8
#Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
#SPDX-License-Identifier: Apache-2.0

import cv2
import numpy as np
import math

class PreProcess:
    def __init__(self, inputs_parameters, type='Object_Detection'):
        self.inputs_params = inputs_parameters
        self.detection_type = type


    def process(self, object):
        if self.detection_type == 'Object_Detection' or self.detection_type == 'Open_Pose':
            return self.preprocess_image(object)
        else:
            raise Exception('Preprocessing not yet implemented for model type: ' + self.onnx_model_type)


    def preprocess_image(self, img):
        print(self.inputs_params)
        if self.inputs_params["input_resize_type"] is not None:
            for item in self.inputs_params["input_resize_type"]:
                if item == 'Stretch':
                    # Use cv2 instread of PIL.IMAGE since OpenCV outperform PIL framework about 24x
                    # Benchmark: https://github.com/ethereon/lycon#benchmarks
                    img_np = cv2.resize(img, self.inputs_params["input_image_size"])
                elif item == 'Letterbox':
                    img_np = self.letterbox_image(img, tuple(reversed(self.inputs_params["input_image_size"])))
                elif item == 'Ratio':
                    image_h, image_w, _ = img.shape
                    ratio = self.inputs_params["input_image_size"][1] / min(image_h, image_w)
                    new_image_size = (int(ratio * image_w), int(ratio * image_h))
                    img_np = cv2.resize(img, new_image_size, cv2.INTER_LINEAR)

        if 'stride' in self.inputs_params.keys():
            if self.inputs_params["stride"] is not None:
                stride = int(self.inputs_params["stride"])
                img_np = img_np[0:img_np.shape[0] - (img_np.shape[0] % stride),
                      0:img_np.shape[1] - (img_np.shape[1] % stride)]

        # OpenCV encodes in BGR, if model require RGB we need to convert
        if self.inputs_params["image_color_encode"]=='RGB':
            # Convert image from BGR to RGB (or vicevesa)
            img_np = img_np[:, :, ::-1]

        if self.inputs_params["image_encode"] == 'NCHW':
            # convert a tensor(image) from (N)HWC format to (N)CHW format
            # from (h, w, 3) to (3, h, w)
            img_np = img_np.transpose(2, 0, 1)

        # Input normalization as required by SAS VDMML Exported ONNX
        # Divide al array value by 255 (color max value) to normalize the vector with value from 0 to 1
        if self.inputs_params["image_norm"] is not None:
            for item in self.inputs_params["image_norm"]:
                if item == 'ZeroOne':
                    img_np = img_np / 255
                if item == 'MeanVect':
                    mean_vec = np.array(self.inputs_params["mean_vec"])
                    for i in range(img_np.shape[0]):
                        img_np[i, :, :] = img_np[i, :, :] - mean_vec[i]
                if item == 'STDdevVect':
                    stddev_vec = np.array(self.inputs_params["stddev_vec"])
                    for i in range(img_np.shape[0]):
                        img_np[i, :, :] = img_np[i, :, :] / stddev_vec[i]
                if item == 'Mean&STDdevVect':
                    mean_vec = np.array(self.inputs_params["mean_vec"])
                    stddev_vec = np.array(self.inputs_params["stddev_vec"])
                    for i in range(img_np.shape[0]):
                        img_np[i, :, :] = (img_np[i, :, :] - mean_vec[i]) / stddev_vec[i]


        # Pad to be divisible of 32
        if self.inputs_params["image_pad"] is not None:
            pad = self.inputs_params["image_pad"]
            padded_h = int(math.ceil(img_np.shape[1] / pad) * pad)
            padded_w = int(math.ceil(img_np.shape[2] / pad) * pad)

            padded_image = np.zeros((3, padded_h, padded_w), dtype=np.float32)
            padded_image[:, :img_np.shape[1], :img_np.shape[2]] = img_np
            img_np = padded_image

        if self.inputs_params["expand_dims"]:
            img_np = np.expand_dims(img_np, 0)

        output = []
        for input in self.inputs_params["inputs_list"]:
            if input == 'Image':
                output.append(img_np)
            if input == 'Shape':
                image_size = np.array([img.shape[0], img.shape[1]], dtype=np.int32).reshape(1, 2)
                output.append(image_size)

        return output


    def letterbox_image(self, image, expected_size):
      ih, iw, _ = image.shape
      eh, ew = expected_size
      scale = min(eh / ih, ew / iw)
      nh = int(ih * scale)
      nw = int(iw * scale)

      image = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_CUBIC)
      new_img = np.full((eh, ew, 3), 128, dtype='uint8')
      # fill new image with the resized image and centered it
      new_img[(eh - nh) // 2:(eh - nh) // 2 + nh,
              (ew - nw) // 2:(ew - nw) // 2 + nw,
              :] = image.copy()
      return new_img
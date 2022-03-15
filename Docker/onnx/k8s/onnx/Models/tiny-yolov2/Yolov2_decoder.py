#!/usr/bin/env python
# encoding: utf-8
# Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import math
import numpy as np


class Decoder:
    def __init__(self, output_decoder_parameters, inputs_parameters):
        self.decoder_params = output_decoder_parameters
        self.input_image_size = inputs_parameters['input_image_size']
        if 'detection_threshold' in self.decoder_params.keys():
            self.confidenceThresh = self.decoder_params['detection_threshold']
        else:
            self.confidenceThresh = 0.4

    def decode(self, inference_result, image_shape=None, is_video=False):
        return self.decodeYoloV2Output(inference_result[0][0])

    def decodeYoloV2Output(self, inference_result):
        blockSize = 32
        numClasses = self.decoder_params['classes']
        _, gridHeight, gridWidth = inference_result.shape

        out_boxes = np.empty((0, 4), float)
        out_classes = np.asarray([], float)
        out_scores = np.asarray([])

        for cy in range(0, gridHeight):
            for cx in range(0, gridWidth):
                for b in range(0, self.decoder_params['boxPerCell']):
                    channel = b * (numClasses + 5)
                    confidence = self.sigmoid(inference_result[channel + 4][cy][cx])

                    if self.confidenceThresh < confidence:
                        classes = np.zeros(numClasses)
                        for c in range(0, numClasses):
                            classes[c] = inference_result[channel + 5 + c][cy][cx]
                        classes = self.softmax(classes)
                        detectedClass = classes.argmax()

                        if self.confidenceThresh < classes[detectedClass] * confidence:
                            tx = inference_result[channel][cy][cx]
                            ty = inference_result[channel + 1][cy][cx]
                            tw = inference_result[channel + 2][cy][cx]
                            th = inference_result[channel + 3][cy][cx]

                            x = (float(cx) + self.sigmoid(tx)) * blockSize
                            y = (float(cy) + self.sigmoid(ty)) * blockSize

                            w = np.exp(tw) * blockSize * self.decoder_params['anchors'][2 * b]
                            h = np.exp(th) * blockSize * self.decoder_params['anchors'][2 * b + 1]

                            box = np.asarray([(x, y, w, h)])
                            out_boxes = np.append(out_boxes, box, axis=0)
                            out_classes = np.append(out_classes, detectedClass)
                            out_scores = np.append(out_scores, classes[detectedClass] * confidence)

        # check if any box has been detected
        if len(out_boxes):
            pick = self.non_max_suppression_fast(out_boxes, overlapThresh=0.45)

            out_boxes = out_boxes[pick]
            out_classes = out_classes[pick]
            out_scores = out_scores[pick]
            # make image coordinate size independent by dividing all content of box array for current image size declared
            out_boxes = out_boxes / self.input_image_size[0]

        return out_boxes, out_classes, out_scores

    def sigmoid(self, x):
        mysigmoid = lambda x: 0.5 * math.tanh(0.5 * x) + 0.5
        return mysigmoid(x)

    def softmax(self, x):
        scoreMatExp = np.exp(np.asarray(x))
        return scoreMatExp / scoreMatExp.sum(0)

    # Malisiewicz et al.
    def non_max_suppression_fast(self, boxes, overlapThresh):
        # if there are no boxes, return an empty list
        if len(boxes) == 0:
            return []

        # if the bounding boxes integers, convert them to floats --
        # this is important since we'll be doing a bunch of divisions
        if boxes.dtype.kind == "i":
            boxes = boxes.astype("float")

        # initialize the list of picked indexes
        pick = []

        x = boxes[:, 0]
        y = boxes[:, 1]
        w = boxes[:, 2]
        h = boxes[:, 3]

        x1 = (x - w / 2)
        x2 = (x + w / 2)
        y1 = (y - h / 2)
        y2 = (y + h / 2)

        # compute the area of the bounding boxes and sort the bounding
        # boxes by the bottom-right y-coordinate of the bounding box
        area = (x2 - x1 + 1) * (y2 - y1 + 1)
        idxs = np.argsort(y2)

        # keep looping while some indexes still remain in the indexes
        # list
        while len(idxs) > 0:
            # grab the last index in the indexes list and add the
            # index value to the list of picked indexes
            last = len(idxs) - 1
            i = idxs[last]
            pick.append(i)

            # find the largest (x, y) coordinates for the start of
            # the bounding box and the smallest (x, y) coordinates
            # for the end of the bounding box
            xx1 = np.maximum(x1[i], x1[idxs[:last]])
            yy1 = np.maximum(y1[i], y1[idxs[:last]])
            xx2 = np.minimum(x2[i], x2[idxs[:last]])
            yy2 = np.minimum(y2[i], y2[idxs[:last]])

            # compute the width and height of the bounding box
            w = np.maximum(0, xx2 - xx1 + 1)
            h = np.maximum(0, yy2 - yy1 + 1)

            # compute the ratio of overlap
            overlap = (w * h) / area[idxs[:last]]

            # delete all indexes from the index list that have
            idxs = np.delete(idxs, np.concatenate(([last],
                                                   np.where(overlap > overlapThresh)[0])))

        # return only the bounding boxes that were picked using the
        # integer data type
        return pick

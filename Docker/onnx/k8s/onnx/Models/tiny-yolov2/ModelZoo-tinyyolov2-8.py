#!/usr/bin/env python
# encoding: utf-8
#Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
#SPDX-License-Identifier: Apache-2.0

onnx_model = "ModelZoo-tinyyolov2-8.onnx"
#TensorRT might require a Shape Inference to original model
#Visit this link for further information https://github.com/microsoft/onnxruntime/blob/master/docs/execution_providers/TensorRT-ExecutionProvider.md#shape-inference-for-tensorrt-subgraphs
#Below parameters only work for TensorrtExecutionProvider, if not set onnx_model will be used
onnx_model_infer = "ModelZoo-tinyyolov2-8_infer.onnx"
#Model Type
#  Object_Detection
#  Open_Pose
onnx_model_type = "Object_Detection"

#Input Parameters
inputs_parameters= {#Declare all input of the model, in the expected order.
                    #Supporte Type
                    # Image
                    # Shape
                    "inputs_list": ('Image',''),
                    #Image Size width, height
                    "input_image_size" : (416, 416),
                    #Image Normalization Type. 
					#Should be an ordered list to eable muliple actions eg. ['MeanVect','ZeroOne'] or None.
					#The order of the list determin the execution order of commands
                    # None
                    # ['ZeroOne']
                    #   Each Image color is represented by a number from 0 to 255,
                    #   Set this variable to True will divide each color by 255 to bring the range from 0.00 to 1.00
                    # ['MeanVect']
                    #   Standardize the image by subtracting a mean vector                  
                    "image_norm" : None ,
                    #Mean Vector (only used with Image Normalization Type MeanVect
                    "mean_vec" : None,
                    #color encode type
                    # RGB
                    # BRG
                    "image_color_encode" : 'RGB',
                    #image encode type
                    # NHWC
                    # NCHW
                    #    N: number of images in the batch
                    #    H: height of the image
                    #    W: width of the image
                    #    C: number of channels of the image (ex: 3 for RGB, 1 for grayscale...)
                    "image_encode" : 'NCHW',
                    #Resize Type (as required by model for input)
                    # Stretch (aspect ratio loss)
                    # Letterbox (add black stripes to avoid aspect ratio loss)
                    "input_resize_type" : ['Stretch'],
                    #Pad image to be divisible by a number
                    # None - No pad
                    # Value e.g. 32 - should be a power of 2
                    "image_pad": None,
                    #Add a dimension to the output e.g. from (3,416,416) to (1,3,416,416)
                    "expand_dims": True,
                    #Crop image to ensure that size are divisible by stride value
                    "stride": None
                    }

#Output Parameters
output_decoder="Yolov2_decoder.py"
output_decoder_parameters={"detection_threshold" : 0.2,
                           "boxPerCell" :  5,
                           "classes" : 20,
                           "anchors" : [1.08, 1.19, 3.42, 4.41, 6.63, 11.38, 9.42, 5.11, 16.62, 10.52]}
#Coordinate Type
# Top left rectangle (rect): rect specifies a bounding box by using the x and y coordinates of its top left corner along with width and height values
# Centered rectangle (yolo): yolo specifies a bounding box by using the x and y coordinates of its center along with width and height values
# Minimum/Maximum rectangle (coco): coco specifies a bounding box by using the x-min and y-min coordinates of its top left corner along with x-max and y-max coordinates of its bottom right corner
output_coord_type="yolo"
#Additional information needed to draw results
output_data = {"color_palette": [(31, 119, 180), (255, 127, 14),
                         (127, 127, 127), (188, 189, 34),
                         (148, 103, 189), (140, 86, 75),
                         (227, 119, 194), (44, 160, 44),
                         (214, 39, 40), (23, 190, 207)]
}
output_labels = ["aeroplane",
"bicycle",
"bird",
"boat",
"bottle",
"bus",
"car",
"cat",
"chair",
"cow",
"diningtable",
"dog",
"horse",
"motorbike",
"person",
"pottedplant",
"sheep",
"sofa",
"train",
"tvmonitor"]
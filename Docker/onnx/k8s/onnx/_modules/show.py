#! /bigdisk/lax/shhuna/lax/opencv/bin/python3.7

import os
import time
import datetime

import cv2
import numpy as np
import ezpubsub as ezps

from _modules.reportPerf import reportPerf
import _modules.utils as utils

#Set External Parameters
logPerformance = os.environ.get('LOG_PERFOMANCE', 'False')
flip = os.environ.get('ENABLE_CAMERA_FLIP', 'False')
rescale = int(os.environ.get('DISPLAY_RESCALE', 50))/100
prob_threshold = int(os.environ.get('PROB_THRESHOLD', 30))/100
displayModelType = os.environ.get('DISPLAY_MODEL_TYPE', '')
displayModel = os.environ.get('DISPLAY_MODEL', '')
displayEP = os.environ.get('DISPLAY_EP', '')
displayDevice = os.environ.get('DISPLAY_DEVICE', '')
session_id = os.environ.get('SESSION_ID', utils.create_id())
output_directory = os.environ.get('TEST_OUTPUT_SESSION', '/Demos-Home/out/')
output_directory_image=os.environ.get('TEST_OUTPUT', output_directory)
output_csv = os.environ.get('TEST_CSV', 'perfsheet.csv')

#Set Internal Parameters
saveIMGtoDisk=True
waitBeforeExit=5

display = None
out_width = None
out_height = None

#rescale = 0.5
prev_time = None
prev_img = None
curr_iteration=0

font_face = cv2.FONT_HERSHEY_SIMPLEX
font_scale = 1 * rescale
thickness = int(2 * rescale)



def draw_info(image, fps=0, onnx_model=''):
    image_h, image_w, _ = image.shape

    if fps!=0:
      ## put FPS
      text_s = "FPS=%.2f FrameId=%d" % (fps, curr_iteration)
      # font_scale = 1
      size_s = cv2.getTextSize(text_s, font_face, font_scale, thickness)
      text_height_s = int(size_s[0][1])
      cv2.putText(image, text_s, (+5, image_h - text_height_s), font_face, font_scale, (0, 0, 0), thickness + 1, cv2.LINE_AA)
      cv2.putText(image, text_s, (+5, image_h - text_height_s), font_face, font_scale, (240, 240, 240), thickness,
                  cv2.LINE_AA)

    if onnx_model!='':
      text_s = onnx_model + " " + datetime.datetime.now().strftime("%m/%d/%Y %H:%M:%S")
      # font_scale = 0.6
      size_s = cv2.getTextSize(text_s, font_face, font_scale, thickness)
      text_width_s = int(size_s[0][0])
      text_height_s = int(size_s[0][1])
      cv2.putText(image, text_s, (image_w - text_width_s - 2, image_h - text_height_s), font_face, font_scale, (0, 0, 0),
                  thickness + 1, cv2.LINE_AA)
      cv2.putText(image, text_s, (image_w - text_width_s - 2, image_h - text_height_s), font_face, font_scale, (240, 240, 240),
                  thickness, cv2.LINE_AA)
    return image


def perf_counter():
    global prev_time
    if prev_time is None:
        prev_time = time.time()
        fps=0
    else:
        current_time = time.time()
        diff = current_time - prev_time
        if logPerformance.lower()=="true":
            report_perf.counters(diff)
        #print("time iter=%d id=%d diff=%f rate=%f" % (curr_iteration, id, diff, 1/diff))
        print("time iter=%d diff=%f rate=%f" % (curr_iteration, diff, 1/diff))  
        fps=int(1/diff)
        prev_time = current_time
    return fps


def draw_bounding_boxes(row):
  id=0
  if 'id' in row.keys():
    id = row['id']

  if not 'image' in row.keys():
    return None

  image_blob = row['image']
  nparr = np.frombuffer(image_blob, dtype=np.uint8)
  img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
  #if out_width is not None and out_height is not None:
  image_h, image_w, _ = img_np.shape
  img_np = cv2.resize(img_np, (int(image_w * rescale), int(image_h * rescale)), cv2.INTER_LINEAR)

  if 'n_objects' in row.keys():
    n_objects = int(row['n_objects'])
    image_h, image_w, _ = img_np.shape

    if 'labels' in row.keys():
      lbl_list=row['labels'].split(",")

    #font_face = cv2.FONT_HERSHEY_PLAIN
    font_face = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.35
    thickness = 1

    for i in range(n_objects):
      #obj = row['_Object' + str(i) + '_']
      obj = lbl_list[i]
      #prob = float(row['_P_Object' + str(i) + '_'])
      prob = float(row["scores"][i])
      probability = "(" + str(round(prob * 100, 1)) + "%)"
      #x = float(row['_Object' + str(i) + '_x'])
      #y = float(row['_Object' + str(i) + '_y'])
      #width = float(row['_Object' + str(i) + '_width'])
      #height = float(row['_Object' + str(i) + '_height'])      
      x = float(row['coords'][i * 4 + 0])
      y = float(row['coords'][i * 4 + 1])
      width = float(row['coords'][i * 4 + 2])
      height = float(row['coords'][i * 4 + 3])

      if prob < prob_threshold:
        continue

      if 'coords_type' in row.keys():
          coords_type = row['coords_type']
      else:
          coords_type = "yolo"
      
      #print(coords_type)

      box_color = (0, 0, 255) #(b,g,r)
      if coords_type == 'yolo':
        #print("yolo")
        x_min = int(image_w * (x - width / 2))
        y_min = int(image_h * (y - height/ 2))
        x_max = int(image_w * (x + width / 2))
        y_max = int(image_h * (y + height/ 2))
      elif coords_type == 'coco':
        #print("coco")
        #wariable name use yolo convention for coco format they are already x_min, y_min, x_max, y_max just from [0-1]
        x_min = int(image_w * x)
        y_min = int(image_h * y)
        x_max = int(image_w * width)
        y_max = int(image_h * height)
      elif coords_type == 'rect':
        #print("rect")
        x_min = int(image_w * x)
        y_min = int(image_h * y)
        x_max = int(image_w * (x + width))
        y_max = int(image_h * (y + height))

      if flip.lower()=="true":
          print("Flip")
          # flip coordinates
          x_min_f = image_w - x_max
          x_max = image_w - x_min
          x_min = x_min_f


      ## draw bounding box
      cv2.rectangle(img_np, (x_min, y_min), (x_max, y_max), box_color, 1)

      if 'labels' in row.keys():
        ## draw object label
        text = lbl_list[i] + " " + probability
        if sum(box_color) / 3 < 140:
            text_color = (255, 255, 255)  # (b,g,r)
        else:
            text_color = (16, 16, 16)  # (b,g,r)
        size = cv2.getTextSize(text, font_face, font_scale, thickness)

        text_width = int(size[0][0])
        text_height = int(size[0][1])
        line_height = size[1]
        margin = 2

        text_x = x_min + margin
        text_y = y_min - line_height - margin

        # draw a filled rectangle around text
        cv2.rectangle(img_np, (text_x - margin, text_y + line_height + margin),
                      (text_x + text_width + margin, text_y - text_height - margin), box_color, -1)

        cv2.putText(img_np, text, (text_x, text_y), font_face, font_scale, text_color, thickness, cv2.LINE_AA)


  return img_np


def draw_poses(row):
  id=0
  if 'id' in row.keys():
    id = row['id']

  if not 'image' in row.keys():
    return None

  image_blob = row['image']
  nparr = np.frombuffer(image_blob, dtype=np.uint8)
  img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
  #if out_width is not None and out_height is not None:
  image_h, image_w, _ = img_np.shape
  img_np = cv2.resize(img_np, (int(image_w * rescale), int(image_h * rescale)), cv2.INTER_LINEAR)
  image_h, image_w, _ = img_np.shape


  if 'lines_coords' in row.keys():
      lines_coords = row['lines_coords']
      for i in range(len(lines_coords)//4):
        x_min = int(row['lines_coords'][i * 4 + 0] * image_w) 
        y_min = int(row['lines_coords'][i * 4 + 1] * image_h)
        x_max = int(row['lines_coords'][i * 4 + 2] * image_w)
        y_max = int(row['lines_coords'][i * 4 + 3] * image_h)
  
        cv2.line(img_np, (x_min, y_min), (x_max, y_max), (255, 255, 0), 4, cv2.LINE_AA)

  if 'points_coords' in row.keys():
      points_coords = row['points_coords']
      for j in range(len(points_coords)//2):
        x = int(row['points_coords'][j * 2 + 0] * image_w)
        y = int(row['points_coords'][j * 2 + 1] * image_h)

        cv2.circle(img_np, (x, y), 3, (0, 255, 255), -1, cv2.LINE_AA)
  
  return img_np


def process_data(row):
  global prev_img, curr_iteration
  curr_iteration +=1
  model_name=""
  if 'model_name' in row.keys():
    model_name=row['model_name'].replace(".onnx","")

  fps = perf_counter()
  if row['model_type']=="Object_Detection":
    img = draw_bounding_boxes(row)
  elif row['model_type']=="Open_Pose":
    img = draw_poses(row)
  else:
    print(row['model_type'] + " Not Implemented")
    return

  img=draw_info(img, fps, model_name)

  if img is not None:
    if not (display is None or len(display) == 0):
      cv2.imshow('Face Detection', img)
      #cv2.waitKey(500)
      cv2.waitKey(1)
    elif saveIMGtoDisk and curr_iteration > 3 and np.all(prev_img !=img): #skip first iteration to get proper fps
      prev_img=img

      if not os.path.exists(output_directory_image):
          os.makedirs(output_directory_image)      
      cv2.imwrite(os.path.join(output_directory_image, model_name + "_img_" + str(curr_iteration) + ".jpg"), img)
  return


def main():
  StayInLoop=False
  if "DISPLAY" in os.environ:
    display = os.environ["DISPLAY"]
    print("Note: Images will be displayed at " + display)
  else:
    print("Warning: Environment variable DISPLAY not set. No images will be shown.")

  print("Starting code to display ...")
  subUrl = "dfESP://localhost:31416/project/contquery/w_python2"
  print("Flip is:" + flip)
  for i in range(0, 20):
    try:
        subscriber = ezps.Subscriber(subUrl, process_data)
        StayInLoop=True
    except Exception as e:
        print(e)
        time.sleep(2)
        continue
    break

  try:
    script_start= time.time()
    while StayInLoop:
      if prev_time is not None and (time.time() - prev_time) > waitBeforeExit:
        StayInLoop=False
      elif prev_time is None and (time.time() - script_start) > (waitBeforeExit * 10):
        StayInLoop=False
      time.sleep(0.1)
  except KeyboardInterrupt:
    pass

  if logPerformance.lower()=="true":
    report_perf.print_performance()


if __name__ == '__main__':
  if logPerformance.lower()=="true":
    #log = utils.init_logger(displayModel + "_" + uuid + "_perf.log", output_directory)
    log = utils.init_logger()
    report_perf= reportPerf(session_id, displayModelType, displayModel, displayEP,
                          displayDevice, output_csv, output_directory, log)
  main()
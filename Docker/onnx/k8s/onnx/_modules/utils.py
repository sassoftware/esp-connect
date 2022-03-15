import os
import importlib
import uuid
import logging
import cv2
import time

def load_module(module_path):
    module_name = os.path.basename(module_path)
    if module_name.endswith((".py")): module_name=module_name[:-3]
    if module_name.endswith((".onnx")): module_name=module_name[:-5]
    return importlib.import_module(os.path.dirname(module_path)+"."+module_name, package=None)


def calculate_fps(total_time):
    fps = round(1 / total_time, 2)
    return fps


def init_logger(filename='', path='./'):
    handlers = [logging.StreamHandler()]
    if filename is not '':
        if not os.path.exists(path):
            os.makedirs(path)
        #logfilename = os.path.join(os.path.dirname(os.path.realpath(__file__)), filename)
        logfilename = os.path.join(path, filename)
        handlers.append(logging.FileHandler(logfilename, mode='w'))

    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s',
                        handlers=handlers)
    return logging.getLogger()


def create_id():
    return str(uuid.uuid4())[:8]


def first_scoring(Pre_Process,Onnx_Inference, first_img_path='_modules/startup_img.jpg'):
    img = cv2.imread(first_img_path, cv2.IMREAD_COLOR)
    perf_start = time.time()
    inference_input = Pre_Process.process(img)
    perf_pre_process = time.time() - perf_start

    perf_start = time.time()
    inference_result = Onnx_Inference.infer(inference_input)
    perf_inference = time.time() - perf_start
    return perf_pre_process, perf_inference



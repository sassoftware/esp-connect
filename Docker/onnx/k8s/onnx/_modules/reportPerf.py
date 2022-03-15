import platform, os
import _modules.cpuinfo as cpuinfo
import datetime
import csv


class reportPerf:
    def __init__(self, Session_Id, model_type, onnx_model, execution_provider, device, perfcsv, outputDir, log):
        self.session_id = Session_Id
        self.model_type = model_type
        self.onnx_model = onnx_model
        self.execution_provider = execution_provider
        self.device = device

        self.perf_csv = perfcsv
        self.input = input
        self.date = datetime.datetime.now().strftime("%m/%d/%Y %H:%M:%S")
        self.outputDir = outputDir
        self.log = log

       #Init Counters
        self.secs = []
        # self.perf_pre_process = []
        # self.perf_inference = []
        # self.perf_decode = []
        # self.perf_draw_box = []

    def counters(self, secs):
        self.secs.append(secs)

    def print_performance(self):
        # Print performance summary
        self.log.info("")
        self.log.info("")
        self.log.info("--------------------------------------------------------")
        self.log.info("Performance Report of ESP with OnnxRuntime")
        self.log.info('Session ID          : {}'.format(self.session_id))
        self.log.info('Date                : {}'.format(self.date))
        self.log.info("--------------------------------------------------------")
        self.log.info('Platform            : {}'.format(platform.platform()))
        if platform.system() == 'Linux':
            self.log.info('OS Name             : {}'.format(platform.platform()[platform.platform().find("with-") + 5:]))
            self.log.info('System              : {}'.format(platform.node()))
            self.log.info('CPU Model Name      : {}'.format(cpuinfo.cpu.info[0]['model name']))
        else:
            self.log.info('OS Name             : {}'.format(platform.system() + ' ' + platform.release()))
            self.log.info('CPU Model Name      : {}'.format(cpuinfo.cpu.info[0]['ProcessorNameString']))
        self.log.info('Processor Type      : {}'.format(platform.machine()))
        self.log.info("--------------------------------------------------------")
        self.log.info('Model Type          : {}'.format(self.model_type))
        self.log.info('Model Name          : {}'.format(self.onnx_model + ".onnx"))
        self.log.info('Execution Provider  : {}'.format(self.execution_provider))
        if self.execution_provider == 'openvino':
            self.log.info('Device             : {}'.format(self.device))
        self.log.info("--------------------------------------------------------")
        self.log.info('Overall Processing Time (Ave of {0} Image)    : {1:.3f} s / {2:.2f} fps'.
                      format(*self.calc_average(self.secs)))

        self.writetocsv()


    def calc_average(self, value):
        try:
            sec = round(sum(value) / len(value), 3)
            fps = round(len(value) / sum(value), 3)
        except:
            sec = 0
            fps = -1
        return len(value), \
               sec,\
               fps
    

    def writetocsv(self):
        if not self.perf_csv == '':
            outDirFile = os.path.join(self.outputDir, self.perf_csv)
            if platform.system() == 'Linux':
                osname = platform.platform()[platform.platform().find("with-") + 5:]
                cpumodel = cpuinfo.cpu.info[0]['model name']
            else:
                osname = platform.system() + ' ' + platform.release()
                cpumodel = cpuinfo.cpu.info[0]['ProcessorNameString']

            if os.path.exists(outDirFile):
                writeheaders = False
            else:
                writeheaders = True

            with open(outDirFile, 'a', newline='') as csvfile:
                filewriter = csv.writer(csvfile, delimiter=',',
                                        quotechar='|', quoting=csv.QUOTE_MINIMAL)
                if writeheaders:
                    # add this row to enable excel to automatically display CSV in colum
                    # since , is the delimiter to avoid to be escaped with quotechar we include 2 items with one empty ''
                    filewriter.writerow(['SEP=', ''])
                    filewriter.writerow(['Session ID', 'Date',
                                         'Execution Provider', 'Device',
                                         'Model type', 'Model Name',  'Num Iterations',
                                         'Overall Proc (s)', 'Overall Proc (fps)',
                                         'System', 'OS Name', 'CPU Model', 'CPU Type', 'Full Plaftorm',
                                         'Note'])
                device = '' if self.execution_provider != 'openvino' else self.device
                filewriter.writerow([self.session_id, self.date,
                                     self.execution_provider, device,
                                     self.model_type, self.onnx_model + ".onnx", len(self.secs),
                                     '{1}'.format(*self.calc_average(self.secs)), '{2}'.format(*self.calc_average(self.secs)),
                                     platform.system(), osname, cpumodel, platform.machine(), platform.platform(),
                                     ''])

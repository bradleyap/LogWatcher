#!/usr/bin/python

mxLen = 0
l = 0

def getFileData():
	global mxLen
	global l
	dpStr = "{\"fileArr\":["
	file = open("/opt/logwatcher/outputFiles.txt")
	for line in file:
		line = line.strip('\n')
		f = open(line)
		if len(dpStr) > 13:
			dpStr += ","
		l = os.stat(line.strip('\n')).st_size
		if l > mxLen:
			mxLen = l
		dpStr += "{\"name\":\"" + line + "\",\"length\":" + str(l) + "}" 
	dpStr = dpStr + "]}"
	return dpStr



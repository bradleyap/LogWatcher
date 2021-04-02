#!/usr/bin/python

import subprocess
import os
import cgi

# trying out
form = cgi.FieldStorage()
param1 = ""
param2 = ""
param3 = ""
msg = ""
rslt = ""

if form is None:
	msg = "no field storage object"
else:
	if "cmd" in form:
		param1 = form['cmd'].value
		if "filter" in form:
			param2 = form['filter'].value
			if "xfilter" in form:
				param3 = form['xfilter'].value
		if "sampleData" in form:
			param2 = form['sampleData'].value
	if "test" in form:
		msg = ""
		if form['test'].value == "cgiQuery":
			msg = "Able to communicate with queryImpl.cgi"
		if form['test'].value == "java":
			param1 = "testJava"
			param2 = "-"
		if form['test'].value == "toDisk":
			param1 = "testJava"
			param2 = "toFile"
		if form['test'].value == "fromDisk":
			param1 = "testJava"
			param2 = "fromFile"
		if form['test'].value == "openFile":
			param1 = "testJava"
			param2 = "openFile"
			if "testFile" in form:
				param3 = form['testFile'].value
		if form['test'].value == "regressions":
			param1 = "testJava"
			param2 = "regressions"

if param1 == "writeEnv":
	qfile = open("/opt/logwatcher/env.txt","w")
	if not qfile is None:
		qfile.write("environment variables\n\n")
		for name, value in os.environ.items():
			qfile.write(name + " = " + value + "\n")
		qfile.close()
	msg = "env.txt written to /opt/logwatcher"

print "Content-type: text/html\n\n"

if len(msg) > 0:
	print msg
else:
	# call java that executes based on the commands provided in the params
	process = subprocess.Popen(['java','-jar','Luminator.jar',param1,param2,param3],shell=False,stdout=subprocess.PIPE)
	print process.communicate()[0] #returns first element of tuple: (stdout, stderr)


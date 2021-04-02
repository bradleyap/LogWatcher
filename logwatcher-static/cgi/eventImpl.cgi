#!/usr/bin/python

import os
import sys
import subprocess
import cgi


# trying out
form = cgi.FieldStorage()
param1 = ""
param2 = ""
param3 = ""
msg = ""

if form is None:
	msg = "no field storage object"
else:
	if "test" in form:
		if form['test'].value == "cgiDotPlot":
			msg = "Able to communicate with clickDotPlotImple.cgi"
	if "viewFile" in form:
		param1 = "viewFile"
		if "myfilename" in form:
			param2 = form['myfilename'].value
		else:
			msg = "ERROR: filename was not supplied"
		if "fileOffset" in form:
			param3 = form['fileOffset'].value
		else:
			msg += "ERROR: anchor location not supplied"
	else:
		if len(msg) < 1:
			msg = "No valid input recieved"

print "Content-type: text/html\n\n"
if len(msg) > 0:
	print msg
else:
# if need to fetch file then insert anchor into file

# to bring up bitmap use 'getPic' or to bring up file use 'getFile' 
	
	process = subprocess.Popen(['java','-jar','Luminator.jar',param1,param2,param3],shell=False,stdout=subprocess.PIPE)

	#stdout,stderr = process.communicate()
	#print stdout + ' ' + stderr 
	print process.communicate()[0]



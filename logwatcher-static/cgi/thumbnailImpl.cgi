#!/usr/bin/python

import os
import sys
import subprocess
import cgi

form = cgi.FieldStorage()
param1 = ""
param2 = ""
param3 = ""
msg = ""

if form is None:
	msg = "no field storage object"
else:
	if "test" in form:
		if form['test'].value == "cgiThumbnail":
			msg = "Able to communicate with clickThumbnailImpl.cgi"
	if "viewFile" in form:
		param1 = "viewFileEx"
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
	process = subprocess.Popen(['java','-jar','Luminator.jar',param1,param2,param3],shell=False,stdout=subprocess.PIPE)
	print process.communicate()[0] #returns first element of tuple: (stdout, stderr)



#!/usr/bin/python

import os
import subprocess
import cgi
import sys

# trying out
form = cgi.FieldStorage()
param1 = ""
param2 = ""
param3 = ""
param4 = ""
msg = ""
rslt = ""
i = "1"

if form is None:
	msg = "no field storage object"
else:
	if "query" in form:
		param1 = "query"
		param2 = form['query'].value.strip()
		qfile = open("/opt/logwatcher/recentQuery.txt","w")
		if qfile is None:
			msg += "recentQuery.txt does not exist"
		else:
			lineArr = param2.splitlines()
			for line in lineArr:
				if i == "1":
					i = "0"
				else:
					qfile.write("<br/>")
				qfile.write(line.strip())
			qfile.close()
	else:
		msg += "Missing a query string."
	if "currentFile" in form:
		param3 = form['currentFile'].value
	if "maxFileLen" in form:
		param4 = form['maxFileLen'].value

print "Content-type: text/html\n\n"

if len(msg) > 0:
	print msg
else:
	process = subprocess.Popen(['java','-jar','Luminator.jar',param1,param2,param3,param4],shell=False,stdout=subprocess.PIPE)
	rslt = process.communicate()[0] #returns first element of tuple: (stdout, stderr)
	print(rslt)

#qfile = open("/opt/logwatcher/LumOut.txt","w")
#if not qfile is None:
#	qfile.write(rslt)
#	qfile.close()


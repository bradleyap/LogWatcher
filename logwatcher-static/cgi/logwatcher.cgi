#!/usr/bin/python

import os
import cgi
import socket
import subprocess


pyStatus = ""
dbg = "nodebug"
unzip = "nounzip"
mxLen = 0
output = ""

def getFileData():
	global mxLen
	l = 0
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

# is this query?
form = cgi.FieldStorage()

if form is None:
	pyStatus = "no form"

if "debug" in form:
	dbg = "debug"

if "query" in form:
	pyStatus = "we are hitting the query"
	#print "are you asking about:\n"
	#print form['query'];
	#quit()	

print "Content-type: text/html\n\n"

# open logwatcher template 
file = open("mainPage.txt")
htmlString = file.read() 

# insert file data into template string
hostnameStr = socket.getfqdn() 
dotPlotStr = ""
blockCount = "0"
curFileNumber = "0"
fileFilter = "SystemOut.log,messages.log"
fileXFilter = "verbosegc.log"
currentQuery = ""
reloadFromZip = "false"
updateFiles = "false";
file = open("/opt/logwatcher/stateVars.txt")

for line in file:
	lst = line.split(":")
	if len(lst) < 2:
		continue
	if "staleBlockCount:" in line:
		blockCount = lst[1].strip()
	if "curFileNumber:" in line:
		curFileNumber = lst[1]
	if "xfilter:" in line:
		fileXFilter = lst[1].strip()
	else:
		if "filter:" in line:
			fileFilter = lst[1].strip()
	if "updateFileSet:" in line:
		updateFiles = lst[1].strip()
	if "reloadFromZip:" in line:
		if lst[1].strip() == "true":
			reloadFromZip = "true"
			unzip = "unzip"

qfile = open("/opt/logwatcher/recentQuery.txt")
if qfile is None:
	currentQuery = " "
else:
	currentQuery = qfile.read()
	qfile.close()
	if len(currentQuery) < 1:
		qfile = open("/opt/logwatcher/defaultQuery.txt")
		if qfile is None:
			currentQuery = " "
		else:
			currentQuery = qfile.read()
			qfile.close()

# call java to generate dot-plots, sometimes dot-plots are unpopulated 
runAlways = "true"
if runAlways == "true" or blockCount == "0" or reloadFromZip == "true" or updateFiles == "true":
	process = subprocess.Popen(['java','-jar','Luminator.jar','init',unzip,dbg],shell=False,stdout=subprocess.PIPE)
	output = process.communicate()[0]

if len(output) < 1:
	output = 'JSON.parse(\'{"workableData":{"blocks":0,"timelineData":[],"timelineHint":{"yr":"1500"},"keywordColors":[],"statistics":"Error: No data returned from Luminator.jar"}}\')'

dotPlotStr = getFileData() 

decls = "var maxFileLen = " + str(mxLen) + ";\n"
decls += "var staleBlockCount = " + str(blockCount).strip() + ";\n"
decls += "var curFileNum = " + curFileNumber.strip() + ";\n"
decls += "var rasterLength = 50;\n" #hardcode for now
decls += "var columnHt = 200;\n"
decls += "var gutterWd = 5;\n"
decls += "var hostString = \"" + hostnameStr + "\";\n"
decls += "var fileFilter = \"" + fileFilter + "\";\n"
decls += "var fileXFilter = \"" + fileXFilter + "\";\n"

htmlString = htmlString.replace("%%hostname%%",hostnameStr)
htmlString = htmlString.replace("%%dotPlotSlots%%",dotPlotStr)
htmlString = htmlString.replace("%%batchJSDecls%%",decls)
htmlString = htmlString.replace("%%currentQuery%%",currentQuery)
htmlString = htmlString.replace("%%pythonStatus%%",pyStatus)
htmlString = htmlString.replace("%%startData%%",output)

qfile = open("/opt/logwatcher/LuminatorOut.txt","w")
if not qfile is None:
	qfile.write(htmlString)
	qfile.close()


# return page 
print htmlString


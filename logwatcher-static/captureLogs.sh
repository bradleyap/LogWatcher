# captureLogs.sh 
# created Mar 24, 2015 bapliam@us.ibm.com
# update Mar 25, 2015 bapliam@us.ibm.com - using non-interactive scp
# update June 21, 2015 bapliam@us.ibm.com - change 'logviewer' directory to 'logwatcher'
# collects logfile output from target systems to autoWAS system, and sends them to a LogWatcher system
# Note: the AutoWAS utility setupSSH must be run on the LogWatcher hostname before running this script

# gather the logs using AutoWAS, this script must be run in same directory as default.cfg
mkdir tmpLogDir

echo 'calling getLogs, waiting'
cfg -log default.cfg.log -cfg default.cfg getLogs tmpLogDir
wait

echo 'zipping up logs, waiting'
# zip and send to the LogWatcher system
#targetFQDN="bap-tmp-00.rtp.raleigh.ibm.com" 
targetFQDN=$1
zip -r payload.zip tmpLogDir/*
wait

echo 'sending logs to LogWatcher system'
scp payload.zip ${targetFQDN}:/opt/logwatcher/payload.zip
wait

echo 'doing clean-up'
# clean up
rm payload.zip
rm -rf tmpLogDir
echo 'done'



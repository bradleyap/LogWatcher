
//for timeline tics or lines
var bars = [];
var barTags = [];
var zoomDex = 3; //designates which are the primary lines
var barPositions = [];
var mouseBarOffset = 0.0;
var numUnits = [];
var barColors = []; //diagnostic
var upperBarDex = -1;
var lowerBarDex = -1;
var barBank = [];
var tagBank = [];
var barBankDex = -1;
var tagBankDex = -1;
var evtBank = [];
var evtBankDex = -1;
var pLineDensity = 15;//primary line density, lines appearing at shortest intervals
var pLineVisibilityThreshold = 10;
var pLineGraduationThreshold = 120;
var maxVisibleBars = 130;  //will calculate based on tlAreaWidth
var numOffScrnBars = 25; //estimate number of bars to precede bgn time
var tagLowerThreshold = 18; //tag label is now too small to be visible
var tagUpperThreshold = 18; //label is larger enough to be displayed without abbreviation
var tagSizeCode = 0;
var barFrame = {};
var labelFrame = {};
var hrzScrollAlert = false;

//for timeline items
var echelon = []; //group of timeline items in the same band, having same vertical position on a timeline chart
var upperEchelon = -1; //index of highest echelon
var echelonTop = [];
var echelonBottom = [];
var bounds = []; //left and right boundaries in order of time position, where coordinates based on earliest object
var boundsPxls = []; //pixels values held are only valid within current visibility range
var startExact = 0.0; //the precise value of the startBufTime x position minus any time component value smaller than those at primary line level
var arraySpanUnits = 0.0; //the precise value of the endBufTime x position minus the smaller time components
var arraySpanPxls = 0.0;
var spanInDays = 1.0;
var forgottenDaysLH = 0.0;
var initialEventPxlOffset = 0;
var dayFractions = [0.00000001157407,0.00001157407407,0.00069444444444,0.04166666666666,1.0,30,365,3650,36500,365000];	
var isMouseBtnDown = 0;
var mousePos = [];
var selIndex = 0;
var countDays = false; //affects how precise locations are arrived at, if irregular intervals are a concern countDays will be true
var daysReached = []; //takes a month (zero-based) and gives the number of days accumulated since the beginning of the year

//high level
var startBufTime = {}; //start time for primary lines in memory array
var endBufTime = {}; //end time for primary lines in memory array
//A note about the timelineData format:
//For now, the JSON timeline events do not use a compacted date format, and this provides an
//adequate MVP... even though the demand on the network because of message size is 
//constant regardless of zoom level. Events get sent to the browser with exact to the millisecond 
//info, even if the zoom level is set to see years
//In the future it could be possible to limit the number of events retrieved so that only 
//events that share a single a common pixel can be summarized together by a single 'event'
//transmitted over the network
var timelineData = {}; 
var timelineHint = {};

//formatting
var frameLSide = 10;
var frameLPad = 3;
var frameRSide = 104;
var gridLeft = 11;
var w = 15;
var barBkgd = "#aabb66";
var keywordColors = [];
var tlAreaVSize = 10; 
var tlFrameBorderWidth = 2;
var tlFrameBorderClr = "#efefef";
var tlAreaWidth = 106;
var tlContentReductionFactor = 0.95;
var tlPathInsetPxls = 20;
var scrollBarWd = 25;

//diagnostic
var statusMsg = "";
var lastJump = 0;
var lastBarPos = 0;
var numShiftCalls = 0;

function initializeBars(){

	//initialize number of units
	for(var i = 0; i < 10; i++){
		numUnits[i] = 10;
	}
	
	//non-metric units will differ from metric
	numUnits[0] = 1000; //ms
	numUnits[1] = 60; //seconds
	numUnits[2] = 60; //mintues
	numUnits[3] = 24; //hours
	numUnits[4] = 30; //will need to dynamically change to 31 or 28 days
	numUnits[5] = 12; //months
	numUnits[6] = 10; //years
	numUnits[7] = 10; //decades

	//if(t.months == 3 || t.months == 5 || t.months == 8 || t.months == 10)t.maxDays = 29;
	//days from month input array
	daysReached[0] = 0;
	daysReached[1] = 31; //adds Jan
	daysReached[2] = 59; //clients will need to apply leap year adjustment not applied here
	daysReached[3] = 90; //adds Mar
	daysReached[4] = 120; //adds Apr
	daysReached[5] = 151; //adds May
	daysReached[6] = 181; //adds Jun
	daysReached[7] = 212; //adds Jul
	daysReached[8] = 243; //adds Aug
	daysReached[9] = 273; //adds Sep
	daysReached[10] = 304; //adds Oct
	daysReached[11] = 334; //adds Nov

	//initialize indices for iterative bounds
	lowerBarDex = 0;
	upperBarDex = -1;

	//diagnostic only
	barColors[0] = "#ff00aa";
	barColors[1] = "#6666ff";
	barColors[2] = "#ffff66";
	barColors[3] = "#ff66ff";
	barColors[4] = "#66ffff";
	barColors[5] = "#aa8888";
	barColors[6] = "#66bb66";//"#ff9900";
	barColors[7] = "#ffffff"; //"#ff00ff";//"#aaaa88";
	barColors[8] = "#0000ff";
	barColors[9] = "#00FF00";
	barColors[10] = "#333333";	

	labelFrame = document.getElementById("lfrm");
	barFrame = document.getElementById("bfrm");
}

function prepEventData(buf=null){
	var evt = null;
	var t1 = null;
	var t2 = null;
	var firstEvent = {};
	var lastEvent = {};
	var earlyVal = Number.MAX_VALUE;
	var lateVal = -1.0;
	var span = [];
	var kwdColor = "black";
	var begin = getDatetimeFromCalendarTime(timelineHint);
	
	//determine time of earliest and latest events
	for(var i = 0; i < timelineData.length; i++){
		var fileGrp = timelineData[i];
		for(var j = 0; j < fileGrp.keywordGrps.length; j++){
			var kwdGrp = fileGrp.keywordGrps[j];
			for(var k = 0; k < kwdGrp.items.length; k++){
				t1 = null;
				if(evtBankDex > -1)t1 = evtBank[evtBankDex].bgnDatetime;
				if(t1 === null)t1 = new datetime("",0,0,0,0,0,0,0,"");
				t1.setTimeFromSparseDatetime(kwdGrp.items[k].bgn);
				span[0] = calculatePreciseOffsetInDays(begin,t1);
				if(kwdGrp.items[k].end !== undefined){
					t2 = null;
					if(evtBankDex > -1)t2 = evtBank[evtBankDex].endDatetime;
					if(t2 === null)t2 = new datetime("",0,0,0,0,0,0,0,"");
					t2.setTimeFromSparseDatetime(kwdGrp.items[k].end);
					span[1] = calculatePreciseOffsetInDays(begin,t2);
					if(span[1] > lateVal && t2 !== null){
						lastEvent = t2;
						lateVal = span[1];
					}
				}
				else {
					span[1] = span[0];
					t2 = null;
					if(span[0] > lateVal){
						lastEvent = t1;
						lateVal = span[0];
					}
				}
				if(evtBankDex > -1){
					evt = evtBank[evtBankDex];
					evtBankDex--;
				}
				kwdGrp.items[k].domEventOb = createEvent(span,t1,t2,0,kwdColor,evt);
				if(span[0] < earlyVal){
					firstEvent = t1;
					earlyVal = span[0];
				}
				evt = null;
			}
		}
	}
	if(buf === null)return;
	buf[0] = firstEvent;
	buf[1] = lastEvent;
}

function prepTimeframe(){

	computeTLFrameWidth();

	//compute the number of visible bars
	maxVisibleBars = tlAreaWidth / (pLineVisibilityThreshold - 1); //Without '-1' then not enough visible bars, which can prevent demotePrimaryLines from being called

	//add extra primary lines to each side of the timeframe
	spanInDays = calculatePreciseOffsetInDays(startBufTime,endBufTime);
	
	//determine primary line level
	determinePrimaryLineLevelAndDensityApprox(); //initializes zoomDex, based on tlAreaWidth 

	computeAndSaveInitialTimelinePixelOffset();
	
	forgetSubZoomTime();//the bars must be exactly n increments from eachother
}

function computeTLFrameWidth(){
	tlAreaWidth = window.innerWidth - (scrollBarWd + (2 * gridLeft));
	labelFrame.style.width = tlAreaWidth - 6 + "px";
	var wframe = document.getElementById("wfrm");
	wframe.style.border = tlFrameBorderWidth + "px solid " + tlFrameBorderClr;
	wframe.style.width = (tlAreaWidth - 6)+ "px";
	frameRSide = tlAreaWidth;
}

function determinePrimaryLineLevelAndDensityApprox(){ 
	var displayPixels = tlContentReductionFactor * tlAreaWidth;
	if(displayPixels == 0)return;
	var idealDays = (pLineVisibilityThreshold * spanInDays) / displayPixels;
	var lastVisibleLevel = 7;	
	for(var level = 7;level > -1;level--){
		if(dayFractions[level] < idealDays)break;
		lastVisibleLevel = level; 
	}
	pLineDensity = (dayFractions[lastVisibleLevel] * displayPixels) / spanInDays;
	zoomDex = lastVisibleLevel;	
	setZoomLevelConfiguration();
}

function computeAndSaveInitialTimelinePixelOffset(){

	//computeForgottenDaysLHS
	var tmp = new datetime("",0,0,0,0,0,0,0,"");
	tmp.setTime(startBufTime);
	forgetThisSubZoomTime(tmp);
	forgottenDaysLH = calculatePreciseOffsetInDays(tmp,startBufTime);

	//we assert that the events initially span of some fraction of the width of the timeline pane
	var neededPxls = tlContentReductionFactor * tlAreaWidth; //frameRSide;
	var overage = frameRSide - neededPxls;
	var droppedPxls = 0;
	var firstEvtDif = overage / 2;
	if(spanInDays != 0)droppedPxls = (forgottenDaysLH * neededPxls) / spanInDays;
	else droppedPxls = 0;
	initialEventPxlOffset = firstEvtDif - droppedPxls;
}

function loadFilenamesAndRowElementsFromTimelineData(){

	var wprFrame = document.getElementById("wfrm");
	var fileGrp = {};
	var frmVOff = 40;
	var evtVOff = 25;
	var origFrmVOff = frmVOff;
	var fileGrpPanel = {};
	var pathLabel = {};
	var fdob = JSON.parse(fileData);
	wprFrame.style.border = tlFrameBorderWidth + "px solid " + tlFrameBorderClr;
	wprFrame.style.width = (tlAreaWidth - 6)+ "px";
	wprFrame.style.height = "500px"; //initial height should be over-written
	for(var i = 0; i < timelineData.length; i++){
		fileGrp = timelineData[i];
		fileGrpPanel = document.getElementById('fpg' + i);
		if(fileGrpPanel === undefined || fileGrpPanel === null){
			fileGrpPanel = document.createElement('div');
			fileGrpPanel.id = 'fpg' + i;
		}
		fileGrpPanel.className = "filepathpane"; //setAttribute("class","filepathpane");
		fileGrpPanel.style.width = (tlAreaWidth - 12) + "px";//6 px margin on each side
		fileGrpPanel.style.top = frmVOff + "px";
		fileGrp.fileGrpPanel = fileGrpPanel;
		wprFrame.appendChild(fileGrpPanel);
		pathLabel = document.getElementById('pl' + i);
		if(pathLabel === undefined || pathLabel === null){
			pathLabel = document.createElement('div');
			pathLabel.id = 'pl' + i;
		}
		pathLabel.innerHTML = fileGrp.filename; 
		pathLabel.className = "filepath"; //.setAttribute("class","filepath");
		pathLabel.index = 0;
		pathLabel.style.top = frmVOff + 3 + "px";
		pathLabel.style.left = tlPathInsetPxls + "px"; //"20px";
		//not making text a child of it's pane because opacity and z-index is browser-hosed
		//also we are using absolute positioning to get the text background color to size correctly 
		wprFrame.appendChild(pathLabel);
		pathLabel.addEventListener("click",function(event){
			if(currentSel !== null && currentSel.style !== undefined)currentSel.className = "filepath";
			currentSel = this;
			this.className = "filepathSel";
			curFileNum = this.index + 1;
			currrentFile = fdob.fileArr[this.index].name;	
		});

		evtVOff = 25;
		for(var j = 0; j < fileGrp.keywordGrps.length; j++){
			var kwdGrp = fileGrp.keywordGrps[j];
			for(var k = 0; k < kwdGrp.items.length; k++){
				kwdGrp.items[k].domEventOb.style.backgroundColor = keywordColors[kwdGrp.keywordId];
				kwdGrp.items[k].domEventOb.style.top = frmVOff + evtVOff + "px";
			}
			evtVOff += 10;
		}
		frmVOff = frmVOff + evtVOff + 5; //5px padding
		fileGrpPanel.style.height = frmVOff - origFrmVOff + "px";
		frmVOff += 3;
		tlAreaVSize = origFrmVOff = frmVOff;
		tlAreaVSize -= 8;
	}
}

function updatePreciseTimelinePositions(){

	for(var i = 0; i < timelineData.length; i++){
		var fileGrp = timelineData[i];
		for(var j = 0; j < fileGrp.keywordGrps.length; j++){
			var kwdGrp = fileGrp.keywordGrps[j];
			for(var k = 0; k < kwdGrp.items.length; k++){
				evt = kwdGrp.items[k].domEventOb;
				evt.bgnExact = calculatePreciseOffsetInDays(startBufTime,evt.bgnDatetime);
				if(evt.endDatetime !== null)evt.endExact = calculatePreciseOffsetInDays(startBufTime,evt.endDatetime);
				else evt.endExact = evt.bgnExact;
			}
		}
	}
}

function assignXPositionsToEvents(init=false){
	var evt = {};
	var xposBgn = 0;
	var xposEnd = 0;
	var adj = barPositions[0]; 
	arraySpanPxls = barPositions[upperBarDex] - barPositions[0];
	//kludge to compensate for the fact that the endBufTime has been incremented beyond bar 179
	var ebt2 = new datetime("",0,0,0,0,0,0,0,""); //use copy of endbuftime
	ebt2.setTime(endBufTime);
	ebt2.turnback(zoomDex);
	arraySpanUnits = calculatePreciseOffsetInDays(startBufTime,ebt2);
	
	//determine time of earliest and latest events
	for(var i = 0; i < timelineData.length; i++){
		var fileGrp = timelineData[i];
		for(var j = 0; j < fileGrp.keywordGrps.length; j++){
			var kwdGrp = fileGrp.keywordGrps[j];
			for(var k = 0; k < kwdGrp.items.length; k++){
				evt = kwdGrp.items[k].domEventOb;
				xposBgn = Math.floor((evt.bgnExact * arraySpanPxls) / arraySpanUnits) + adj;
				evt.xpos = xposBgn;
				evt.style.left = (xposBgn - 5) + "px";
				xposEnd = Math.floor((evt.endExact * arraySpanPxls) / arraySpanUnits) + adj;
				if(xposEnd <= (xposBgn + 10))evt.style.width = "10px";
				else evt.style.width = (xposEnd - xposBgn) + "px";
				evt.style.height = "10px";
				if(evt.xpos < frameLPad || evt.xpos > frameRSide){
					evt.style.display = "none";
				}
				else evt.style.display = "block";	
			}
		}
	}
}

/*
 * Because browser does not expose GC, we try to reuse anything in the DOM. This is may in fact make matters worse ... it may cause things in the timeline pane to not be GC'd, which case we would just comment out calls to this banking function
 */
function bankAllEvents(){
	var kwdGrp = null;	
	for(var i = 0; i < timelineData.length; i++){
		var fileGrp = timelineData[i];
		for(var j = 0; j < fileGrp.keywordGrps.length; j++){
			kwdGrp = fileGrp.keywordGrps[j];
			for(var k = 0; k < kwdGrp.items.length; k++){
				evtBankDex++;
				evtBank[evtBankDex] = kwdGrp.items[k].domEventOb;
				evtBank[evtBankDex].style.display = "none";
				kwdGrp.items[k].domEventOb = null;
			}
		}
	}
}

function setVerticalPosForTimeline(){
	document.getElementById('wfrm').style.height = tlAreaVSize + "px";
	var barHt = tlAreaVSize;
	for(var i=0; i < upperBarDex; i++){
		bars[i].style.height = barHt +  "px";
		if(bars[i].syncParent !== null)setParentBarHeights(bars[i].syncParent,barHt);
	} 
}

function setParentBarHeights(parentBar,ht){
	parentBar.style.height = ht + "px";
	if(parentBar.syncParent !== null)setParentBarHeights(parentBar.syncParent,ht);
}

function calculatePreciseOffsetInDays(t0,time){

	if(time === undefined)return 0.0;
	if(t0 === undefined)return 0.0;

	//calculate in days
	var days = 0.00;
	var dif = 0;
	for(var i = 7; i > -1; i--){
		if(i == 6){ 
			dif = time.years - t0.years;
			if(dif > 0 && dif < 4){
				var t = new datetime("",0,0,0,0,0,0,0,"");
				t.setTime(t0);
				for(var j = dif; j > 0; j--){
					if(isLeapYear(t.year))days += 366.00;
					else days += 365.00;
					t.advance(6); 
				}
			}
			else days = dif * 365.25;
		}
		else if(i == 5){
			days -= accumulativeDaysFromMonthComponent(t0);
			days += accumulativeDaysFromMonthComponent(time);
		}
		else if(i == 4){ 
			days -= (1.0 * t0.days);
			days += (1.0 * time.days);
		}
		else if(i == 3){ 
			days += ((time.hours - t0.hours) / 24.00);
		}
		else if(i == 2){ 
			days += ((time.minutes - t0.minutes) / 1440.00);
		}
		else if(i == 1){ 
			days += ((time.seconds - t0.seconds) / 86400.00);
		}
		else if(i == 0){
			days += ((time.mss - t0.mss) / 86400000.00);
		}
	}
	return days;
}

function createEvent(span,bgn,end,ypos,color,evt){
	var item = evt;
	if(evt === null){
		item = document.createElement("div");
		barFrame.appendChild(item);
	}
	item.style.position = "relative";
	item.style.top = ypos + "px";
	item.bgnExact = span[0];
	item.endExact = span[1];
	if(bgn !== undefined)item.bgnDatetime = bgn;
	else item.bgnDatetime = null;
	if(end !== undefined)item.endDatetime = end;
	else item.endDatetime = null;
	item.style.background = color;
	item.style.position = "absolute";
	item.style.zIndex = "55";
	item.style.display = "block";
	return item;
}

//JSON data may not have all the fields of a datatime object
function getDatetimeFromCalendarTime(eT){
	var t = new datetime("",0,0,0,0,0,0,0,"");
	if(eT.yr !== undefined)t.years = eT.yr;
	if(eT.mo !== undefined)t.months = eT.mo;
	if(eT.dy !== undefined)t.days = eT.dy - 1;
	if(eT.hr !== undefined){
		//if meridian is not specified then time taken as military time
		t.hours = eT.hr;
		if(eT.meridian !== undefined && eT.meridian === "pm")t.hours = 12 + eT.hr;
	}
	if(eT.mn !== undefined)t.minutes = eT.mn;
	if(eT.sc !== undefined)t.seconds = eT.sc;
	if(eT.ms !== undefined)t.mss = eT.ms;
	return t;
}

function zoom(w,mouseXPos){
	var startDex = getBarFromPt(mouseXPos); 
	var n = 0;
	var visible = true;
	var dstr = "block";
	var ldstr = "block";
	var adjustTag = null;
	var d = Math.floor(pLineDensity / pLineVisibilityThreshold);

	if(w < 0){ //zooming out...squeezing bars together
		d = 0 - d;
		if((pLineDensity + d) < pLineVisibilityThreshold && zoomDex > 5)return;
		if(barPositions[lowerBarDex] > 0){	
			shiftAndReplaceAttributes(true);
			updatePreciseTimelinePositions();
			assignXPositionsToEvents();
			return;
		}
		else if(barPositions[upperBarDex] < frameRSide){
			shiftAndReplaceAttributes(false);
			updatePreciseTimelinePositions();
			assignXPositionsToEvents();
			return;
		}
	}
	if(tagSizeCode == 0){
		if(pLineDensity > tagLowerThreshold){
			tagSizeCode = 1;
			adjustTag = shortLabel;
		}
	}
	else if(tagSizeCode == 1){
		if(pLineDensity > tagUpperThreshold){
			tagSizeCode = 2;
			adjustTag = longLabel;
		}
		if(pLineDensity < tagLowerThreshold){
			tagSizeCode = 0;
			adjustTag = noLabel;	
		}
	}
	else if(tagSizeCode == 2){
		if(pLineDensity < tagUpperThreshold){
			tagSizeCode = 1;
			adjustTag = shortLabel;
		}
	}

	pLineDensity = pLineDensity + d;

	if(pLineDensity < pLineVisibilityThreshold){ //zoom out reached threshold
		if(zoomDex < 6){
			demotePrimaryLines(startDex);
			forgetSubZoomTime();	
			updatePreciseTimelinePositions();
			assignXPositionsToEvents();
			return;
		}
	}
	else if(pLineDensity > pLineGraduationThreshold){ //zoom in reached threshold
		if(zoomDex > 0){
			promotePrimaryLines(startDex);
			forgetSubZoomTime();	
			updatePreciseTimelinePositions();
			assignXPositionsToEvents();
			return;
		}
	}

	for(var i = startDex; i <= upperBarDex; i++){
		barPositions[i] += n;
		if(barPositions[i] > frameRSide || barPositions[i] < frameLPad){
			dstr = "none";
			ldstr = "none";
		}
		else {
			dstr = "block";
			ldstr = "block";
		}
		bars[i].style.left = barPositions[i] + "px";
		barTags[i].style.left = barPositions[i] - 3 + "px";
		if(bars[i].contextTag !== null){
			bars[i].contextTag.style.left = barPositions[i] + "px";
			bars[i].contextTag.style.display = ldstr;
		}
		if(adjustTag !== null)adjustTag(i);
		bars[i].style.display = dstr;
		barTags[i].style.display = ldstr;
		if(bars[i].syncParent !== null)repositionAncestors(bars[i].syncParent,barPositions[i],dstr);
		n += d;
	}
	n = mouseBarOffset;
	for(var i = startDex; i >= lowerBarDex; i--){
		barPositions[i] += n;
		if(barPositions[i] < frameLPad || barPositions[i] > frameRSide){
			dstr = "none";
			ldstr = "none";
		}
		else {
			dstr = "block";
			ldstr = "block";
		}
		bars[i].style.left = barPositions[i] + "px";
		barTags[i].style.left = barPositions[i] - 3 + "px";
		if(bars[i].contextTag !== null){
			bars[i].contextTag.style.left = barPositions[i] + "px";
			bars[i].contextTag.style.display = ldstr;
		}
		if(adjustTag !== null)adjustTag(i);
		bars[i].style.display = dstr;
		barTags[i].style.display = ldstr;
		if(bars[i].syncParent !== null)repositionAncestors(bars[i].syncParent,barPositions[i],dstr);
		n -= d;
	}

	if(hrzScrollAlert){
 		updatePreciseTimelinePositions();
		hrzScrollAlert = false;
	}
	assignXPositionsToEvents();
}

function promotePrimaryLines(pivot){ //show smaller time increments
	var origPivotX = pivot;
	for(var i = 0; i < upperBarDex; i++){
		if(i == pivot){
			origPivotX = barPositions[i];
			break;
		}
		startBufTime.advance(zoomDex);
	}

	zoomDex--;	
	pLineDensity = pLineVisibilityThreshold;
	setZoomLevelConfiguration();

	var i = 0;
	var ob = {};
	var startDex = Math.floor(numOffScrnBars + (barPositions[pivot] / pLineDensity));
	var xpos = barPositions[pivot]; //initially xpos is the pivot bar screen location
	var time = new datetime("",0,0,0,0,0,0,0,"");
	startBufTime.index = startDex;
	time.setTime(startBufTime);
	//move startBufTime to new head position and attibutes for any syncParents of primary lines
	startBufTime.turnback(zoomDex);
	xpos -= pLineDensity;
	for(i = startDex - 1; xpos > -1; i--){
		//set new time attributes
		ob = bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "block";
		barPositions[i] = xpos;
		initBarTag(barTags[i],xpos,startBufTime,zoomDex,tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			barBankDex++;
			barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = startBufTime.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(startBufTime,zoomDex + 1,xpos,3,"block",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			var level = zoomDex + 1;
			initBarTag(ob.contextTag,xpos,startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			tagBankDex++;
			tagBank[tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= pLineDensity;
		startBufTime.turnback(zoomDex);
	}

	for( ;i >= lowerBarDex; i--){
		ob = bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "none";
		barPositions[i] = xpos;
		initBarTag(barTags[i],xpos,startBufTime,zoomDex,tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			barBankDex++;
			barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = startBufTime.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(startBufTime,zoomDex + 1,xpos,3,"none",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			var level = zoomDex + 1;
			initBarTag(ob.contextTag,xpos,startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			tagBankDex++;
			tagBank[tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= pLineDensity;
		startBufTime.turnback(zoomDex);
	}
	startBufTime.advance(zoomDex);

	//advance from pivot visible with copy of startBufTime
	xpos = origPivotX;
	var dstr = "block"; //indicates the CSS "display" attribute value
	for(i = startDex ;i <= upperBarDex; i++){
		ob = bars[i];
		//set new time attributes
		ob.style.left = xpos + "px";
		if(xpos > frameRSide)dstr = "none";//faster to break here and put another loop?
		ob.style.display = dstr;
		barPositions[i] = xpos;
		initBarTag(barTags[i],xpos,time,zoomDex,tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			barBankDex++;
			barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = time.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(time,zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			var level = zoomDex + 1;
			initBarTag(ob.contextTag,xpos,time,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),time,level);
			ob.contextTag.style.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			tagBankDex++;
			tagBank[tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos += pLineDensity;
		time.advance(zoomDex);	
	}
	endBufTime.setTime(time);

//	var stob = document.getElementById("status");
//	stob.innerHTML = statusMsg;

}

function demotePrimaryLines(pivot){ //hide smaller time increments
	
	//if no syncParent on pivot, we must designate a new pivot
	while(bars[pivot].syncParent === null){
		pivot++;
		if(pivot > upperBarDex){
			//this could happen if bars to the right of the mouse do not reach a 
			//parent representing a seconds tic... the result would be a sudden
			//visible jerk
			pivot = upperBarDex;
			break;
		}
	}

	var origPivotX = 0;
	for(var i = 0; i < upperBarDex; i++){
		if(i == pivot){
			//pivot is primary line  bar just to the right of the mouse before any demotion
			origPivotX = barPositions[i];
			break;
		}
		startBufTime.advance(zoomDex);
	}

	zoomDex++;	
	pLineDensity = Math.floor(maxTimeComponent(zoomDex - 1) * pLineVisibilityThreshold);
	setZoomLevelConfiguration();

	var i = 0;
	var ob = {};
	var startDex = Math.floor(numOffScrnBars + (barPositions[pivot] / pLineGraduationThreshold));
	var xpos = barPositions[pivot]; //initially xpos is the pivot bar screen location
	var time = new datetime("",0,0,0,0,0,0,0,"");
	startBufTime.index = startDex;
	time.setTime(startBufTime);
	//move startBufTime to new head position
	startBufTime.turnback(zoomDex);
	xpos -= pLineDensity;
	for(i = startDex - 1; xpos > -1; i--){
		//set new time attributes
		ob = bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "block";
		barPositions[i] = xpos;
		initBarTag(barTags[i],xpos,startBufTime,zoomDex,tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			barBankDex++;
			barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = startBufTime.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(startBufTime,zoomDex + 1,xpos,3,"block",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			var level = zoomDex + 1;
			initBarTag(ob.contextTag,xpos,startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			tagBankDex++;
			tagBank[tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= pLineDensity;
		startBufTime.turnback(zoomDex);
	}

	for( ;i >= lowerBarDex; i--){
		ob = bars[i];
		ob.style.left = xpos + "px";
		ob.style.display = "none";
		barPositions[i] = xpos;
		initBarTag(barTags[i],xpos,startBufTime,zoomDex,tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			barBankDex++;
			barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = startBufTime.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(startBufTime,zoomDex + 1,xpos,3,"none",ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			var level = zoomDex + 1;
			initBarTag(ob.contextTag,xpos,startBufTime,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),startBufTime,level);
			ob.contextTag.style.display = "block";
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			tagBankDex++;
			tagBank[tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos -= pLineDensity;
		startBufTime.turnback(zoomDex);
	}
	startBufTime.advance(zoomDex);

	//advance from visible pivot with copy of startBufTime
	var dstr = "block"; //indicates the CSS "display" attribute value
	xpos = origPivotX;
	for(i = startDex ;i <= upperBarDex; i++){
		ob = bars[i];
		//set new time attributes
		ob.style.left = xpos + "px";
		if(xpos > frameRSide)dstr = "none";
		ob.style.display = dstr;
		barPositions[i] = xpos;
		initBarTag(barTags[i],xpos,time,zoomDex,tagSizeCode);
		if(ob.syncParent !== null){
			showSyncParents(ob.syncParent,false);
			barBankDex++;
			barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		var c = time.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(time,zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			var level = zoomDex + 1;
			initBarTag(ob.contextTag,xpos,time,level,2);
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),time,level);
			ob.contextTag.style.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		else if(ob.contextTag !== null){
			ob.contextTag.style.display = "none";
			tagBankDex++;
			tagBank[tagBankDex] = ob.contextTag;
			ob.contextTag = null;
		}
		xpos += pLineDensity;
		time.advance(zoomDex);	
	}
	endBufTime.setTime(time);

//	var stob = document.getElementById("status");
//	stob.innerHTML = statusMsg;

}

function shortLabel(i){
	barTags[i].innerHTML = barTags[i].shortHTML;
}

function longLabel(i){
	barTags[i].innerHTML = barTags[i].longHTML;
}

function noLabel(i){
	barTags[i].innerHTML = "";
}

function getBarFromPt(xpos){
	for(var i = 0; i <= upperBarDex; i++){
		if(xpos <= barPositions[i]){
			return i;
		}	
	}
}

function shiftAndReplaceAttributes(userRDrag){
	shiftBarProperties(numOffScrnBars,userRDrag);
	if(userRDrag){
		for(var p = 0; p < numOffScrnBars; p++){
			endBufTime.turnback(zoomDex);
		}
		fixLeftSide();
	}
	else {
		for(var p = 0; p < numOffScrnBars; p++){
			startBufTime.advance(zoomDex);
		}
		fixRightSide();
	}
}

function shiftBarProperties(n,shiftRight){
	if(shiftRight == true){//properties shift to the right, bar array shifts to the left relative to props, user sees no visible movement
		var tgt = upperBarDex;
		for(var src = (tgt - n); src > -1; src -= 1){
			bars[tgt].style.left = bars[src].style.left;
			bars[tgt].style.display = bars[src].style.display;
			bars[tgt].style.background = barBkgd;
			barPositions[tgt] = barPositions[src];
			barTags[tgt].style.left = barTags[src].style.left;
			barTags[tgt].style.display = barTags[src].style.display;
			barTags[tgt].innerHTML = barTags[src].innerHTML;
			barTags[tgt].shortHTML = barTags[src].shortHTML;
			barTags[tgt].longHTML = barTags[src].longHTML;
			if(bars[tgt].syncParent !== null){
				if(tgt > (upperBarDex - n)){ //bank before target gets overwritten	
					showSyncParents(bars[tgt].syncParent,false);
					colorSyncParents(bars[tgt].syncParent,barBkgd);
					barBankDex++;
					barBank[barBankDex] = bars[tgt].syncParent;
				}
			}
			if(bars[tgt].contextTag !== null){
				bars[tgt].contextTag.style.display = "none";
				tagBankDex++;
				tagBank[tagBankDex] = bars[tgt].contextTag;
				bars[tgt].contextTag = null;
			}
			if(bars[src].contextTag !== null){
				if(bars[tgt].contextTag === null){
					bars[tgt].contextTag = appropriateContextTag();
				}
				bars[tgt].contextTag.innerHTML = bars[src].contextTag.innerHTML;
				bars[tgt].contextTag.display = bars[src].contextTag.display;
				bars[tgt].contextTag.style.left = bars[src].contextTag.style.left;
				bars[src].contextTag.style.display = "none";
				tagBankDex++;
				tagBank[tagBankDex] = bars[src].contextTag;
				bars[src].contextTag = null;
			}
			bars[tgt].syncParent = bars[src].syncParent;
			bars[src].syncParent = null;
			tgt -= 1;
		} 
	}
	else {
		var tgt = 0;
		for(var src = n;src <= upperBarDex;src += 1){
			bars[tgt].style.left = bars[src].style.left;
			bars[tgt].style.display = bars[src].style.display;
			bars[tgt].style.background = barBkgd;
			barPositions[tgt] = barPositions[src];
			barTags[tgt].style.left = barTags[src].style.left;
			barTags[tgt].style.display = barTags[src].style.display;
			barTags[tgt].innerHTML = barTags[src].innerHTML;
			barTags[tgt].longHTML = barTags[src].longHTML;
			barTags[tgt].shortHTML = barTags[src].shortHTML;
			if(bars[tgt].syncParent !== null){
				if(tgt <  n){ //bank before target gets overwritten	
					showSyncParents(bars[tgt].syncParent,false);
					colorSyncParents(bars[tgt].syncParent,barBkgd);
					barBankDex++;
					barBank[barBankDex] = bars[tgt].syncParent;
				}
			}
			if(bars[tgt].contextTag !== null){
				bars[tgt].contextTag.style.display = "none";
				tagBankDex++;
				tagBank[tagBankDex] = bars[tgt].contextTag;
				bars[tgt].contextTag = null;
			}
			if(bars[src].contextTag !== null){
				if(bars[tgt].contextTag === null){
					bars[tgt].contextTag = appropriateContextTag();
				}
				bars[tgt].contextTag.innerHTML = bars[src].contextTag.innerHTML;
				bars[tgt].contextTag.display = bars[src].contextTag.display;
				bars[tgt].contextTag.style.left = bars[src].contextTag.style.left;
				bars[src].contextTag.style.display = "none";
				tagBankDex++;
				tagBank[tagBankDex] = bars[src].contextTag;
				bars[src].contextTag = null;
			}
			bars[tgt].syncParent = bars[src].syncParent;
			bars[src].syncParent = null;
			tgt += 1;
		}
	}
}

function colorSyncParents(parent,color){
	if(parent === null)return;
	parent.style.background = color;
	if(parent.syncParent !== null)colorSyncParents(parent.syncParent,color);
}

function showSyncParents(parent,show){
	if(parent === null)return;
	if(show){
		parent.style.display = "block";
		if(parent.contextTag !== null){
			parent.contextTag.style.display = "block";
		}
	}
	else {
		parent.style.display = "none";
		if(parent.contextTag !== null){
			parent.contextTag.style.display = "none";
		}
	}
	if(parent.syncParent !== null)showSyncParents(parent.syncParent,show);
}

function repositionAncestors(bar,xpos,barDisplayStr){
	if(bar === undefined)return;
	bar.style.left = xpos + "px";
	bar.style.display = barDisplayStr;
	if(bar.syncParent !== null)repositionAncestors(bar.syncParent,xpos,barDisplayStr);
}

function fixLeftSide(){ //fix bars on left side		
	var ob = {};
	var tag = {};
	var head = lowerBarDex;
	var curDex = head + (numOffScrnBars - 1);
	var xpos = barPositions[head]; 
	var dstr = "block"; //indicates the CSS "display" attribute value
	startBufTime.turnback(zoomDex);
	for(var i = curDex; i >= head; i--){
		if(zoomDex == 100)xpos -=  monthPixelsFromPLineDensity(startBufTime.getComponent(5));
		else xpos -= pLineDensity; 
		ob = bars[i];
		ob.style.left = xpos + "px";
		ob.style.background = barBkgd; 
		tag = barTags[i];
		tag.style.left = (xpos - 3) + "px";
		initBarTag(tag,xpos,startBufTime,zoomDex,tagSizeCode);
		if(xpos < frameLPad)dstr = "none";
		ob.style.display = dstr; 
		tag.style.display = dstr; 
		barPositions[i] = xpos;
		var c = startBufTime.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(startBufTime,zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),startBufTime,zoomDex + 1);
			ob.contextTag.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		startBufTime.turnback(zoomDex);
	}
	startBufTime.advance(zoomDex); 
}

function fixRightSide(){ //fix bars on right side
	var ob = {};
	var tag = {};
	var tail = upperBarDex;
	var curDex = tail - (numOffScrnBars - 1);
	var xpos = barPositions[tail];
	var dstr = "block"; 
	for(var i = curDex; i <= tail; i++){
		if(zoomDex == 100)xpos +=  monthPixelsFromPLineDensity(endBufTime.getComponent(5));
		else xpos += pLineDensity; 
		ob = bars[i];
		ob.style.left = xpos + "px";
		ob.style.background = barBkgd; 
		tag = barTags[i];
		tag.style.left = (xpos - 3) + "px";
		initBarTag(tag,xpos,endBufTime,zoomDex,tagSizeCode);
		if(xpos < frameLPad)dstr = "none";	
		else dstr = "block";
		ob.style.display = dstr;
		if(xpos > (frameRSide - 20))tag.style.display = "none";
		else tag.style.display = "block";
		barPositions[i] = xpos;
		var c = endBufTime.getComponent(zoomDex);
		if(c == 0 || (zoomDex == 6 && ((c % 10) == 0))){
			appropriateAndPositionSynchronizedLines(endBufTime,zoomDex + 1,xpos,3,dstr,ob);
			if(ob.contextTag === null){
				ob.contextTag = appropriateContextTag();
			}
			ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),endBufTime,zoomDex + 1);
			ob.contextTag.display = dstr;
			ob.contextTag.style.left = xpos + "px";
		}
		endBufTime.advance(zoomDex);
	} 
}

function allocateAndSetHorizontalPosForTimeline(){ 
	//bgn,end are visible on screen times
	var counter = new datetime("",0,0,0,0,0,0,0,"");
	counter.setTime(startBufTime);

	var offset = initialEventPxlOffset;//to center the displayed content

	//initialize indices
	upperBarDex = numOffScrnBars - 1;
	lowerBarDex = numOffScrnBars;

	//decrement startBufTime to get to initial time of memory array
	startBufTime.index = numOffScrnBars;	
	for(var i = (numOffScrnBars - 1); i > -1; i--){
		startBufTime.turnback(zoomDex);
		if(zoomDex == 5)offset -=  monthPixelsFromPLineDensity(startBufTime.getComponent(5));
		else offset -= pLineDensity; 
		allocateAndPositionLinesHelper(startBufTime,zoomDex,offset,1,false);
	} 

	//allocate bar objects from start of displayed time to end of array, but leave x elements for later
	offset = initialEventPxlOffset; 
	var lastBarIndex = maxVisibleBars + (2 * numOffScrnBars) - 1;
        counter.index = numOffScrnBars;
	for(var i = numOffScrnBars; i < lastBarIndex; i++){ 
		allocateAndPositionLinesHelper(counter,zoomDex,offset,1,true);
		if(zoomDex == 5)offset += monthPixelsFromPLineDensity(counter.getComponent(5));
		else offset += pLineDensity;
		counter.advance(zoomDex);
	}
	endBufTime.setTime(counter);

	if(checkTimeSync() == false)alert("There was a problem with timeline computation accuracy in allocateAndSetHorizontalPosforTimeline function.");
}

function allocateAndPositionLinesHelper(t,level,xpos,w,allocateRight){
	var dex = 0; 
	if(allocateRight == true){
		upperBarDex = upperBarDex + 1;
		dex = upperBarDex;
	}
	else {
		lowerBarDex = lowerBarDex - 1;
		dex = lowerBarDex;
		if(dex < 0){
			alert("invalid lower index, L001");
			return;
		}
	}
	var dstr = "block";
	if(xpos < frameLPad || xpos > frameRSide){
		dstr = "none";
	}
	var ob = createBar(xpos,w,dstr,null);
	var tag = createBarTag(w,dstr,0);
	initBarTag(tag,xpos,t,level,tagSizeCode);
	bars[dex] = ob;
	barPositions[dex] = xpos;
	barTags[dex] = tag;
	barFrame.appendChild(ob);
	labelFrame.appendChild(tag);

	var c = t.getComponent(level);
	if(c == 0 || (level == 6 && ((c % 10) == 0))){
		level += 1;
		appropriateAndPositionSynchronizedLines(t,level,xpos,w + 2,dstr,ob);
		if(ob.contextTag === null){
			ob.contextTag = appropriateContextTag();
		}      
		ob.contextTag.style.display = dstr;
		initBarTag(ob.contextTag,xpos,t,level,2);
		ob.contextTag.innerHTML = collectContext(depth(ob.syncParent),t,level);
	}
}

function appropriateAndPositionSynchronizedLines(time,level,xpos,w,cssDisplayStr,child){
	//three cases to handle: 1)child has old syncParent, 2) child has no syncParent and barBank is empty or 3) child has no syncParent and barBank not empty
	var ob = child.syncParent;
	if(ob === null){
		if(barBankDex > -1){
			ob = barBank[barBankDex];
			if(ob.syncParent == null)barBankDex--; 
			else barBank[barBankDex] = ob.syncParent;
			ob.syncParent = null;
		}
		else {
			xpos = Math.floor(xpos);
			ob = createBar(xpos,w,cssDisplayStr,null);
			ob.style.background = barBkgd; 
			//ob.style.background = barColors[Math.floor(Math.random() * 10)]; //barBkgd; 
			barFrame.appendChild(ob);
		}
	}
	ob.style.display = cssDisplayStr;
	ob.style.width = w + "px";
	ob.style.left = xpos + "px";
	child.syncParent = ob;
	var c = time.getComponent(level);
	if(c == 0 || (level == 6 && ((c % 10) == 0))){
		level += 1;
		appropriateAndPositionSynchronizedLines(time,level,xpos,w + 1,cssDisplayStr,ob);
	}
}

function initBarTag(tag,xpos,time,level,tagSize){
	if(tag === null)return;
	tag.style.left = (xpos - 3) + "px";
	tag.style.width = "30px";
	tag.longHTML = time.getComponentLabel(level);
	tag.shortHTML = time.getComponentShortLabel(level); 
	if(tagSize == 2)tag.innerHTML = tag.longHTML;
	else if(tagSize == 1)tag.innerHTML = tag.shortHTML;
	else tag.innerHTML = "";
}
	
function collectContext(num,time,level){
	var c = "";
	if(level < 4){	
		if(level == 1)c = time.seconds;
		if(level == 2)c = time.minutes;
		if(level == 3)c = time.hours;
		if(c < 10)c = "0" + c;
		c = collectContext(num - 1,time,level + 1) + c + ":";
	}
	if(level == 4){
		//if not on month boundary, include month anyway
		c = time.getComponentShortLabel(5) + " " + (time.days + 1);
		if(num > 1)c = c + ", " + time.years;
		c += " ";
	}
	if(level == 5){
		c = time.getComponentLabel(5) + " ";
		if(num > 0)c = c + time.years + " ";
	}
	if(level == 6){
		c = time.years + " ";
	}
	return c;
}

function appropriateContextTag(){
	var tag = null;
	if(tagBankDex > -1){
		tag = tagBank[tagBankDex];
		tagBank[tagBankDex] = null;
		tagBankDex--;
	}
	else {
		tag = createBarTag(2,"block",10);
		tag.className = "ctag";
		labelFrame.appendChild(tag);
	}
	return tag;
}

function createBar(xpos,w,displayStr,parent){
	var ob = document.createElement("div");
	ob.style.top = "5px";
	ob.style.height = tlAreaVSize + "px";
	ob.style.width = w + "px";
	var ctrBump = Math.floor(w / 2);
	ob.style.left = (xpos - ctrBump) + "px";
	ob.style.padding = "0px";
	ob.style.margin = "0px";
	ob.style.display = displayStr;
	ob.style.background = barBkgd;
	ob.style.position = "absolute";
	ob.style.zIndex = "49";
	ob.contextTag = null;
	ob.syncParent = parent;
	ob.syncChild = null;
	return ob;
}

function createBarTag(w,displayStr,pxlBump){
	var tag = document.createElement("div");
	tag.style.top = (12 - pxlBump) + "px";
	tag.style.height = "15px";
	tag.style.width = "15px";
	tag.style.padding = "0px";
	tag.style.margin = "0px";
	tag.style.display = displayStr;
	tag.style.color = "white";
	tag.style.fontSize = "10px";
	tag.style.position = "absolute";
	tag.style.zIndex = "52";
	return tag;
}

function determineDivergentLevel(bgn,end){
	var level = 6;
	while(level > 0){
		if(bgn.getComponent(level) != end.getComponent(level))break;
		level -= 1;
	}	
	return level;
}

function setZoomLevelConfiguration(){
	tagLowerThreshold = 12;
	tagUpperThreshold = 18;
	if(zoomDex == 6){
		tagLowerThreshold = 15;
		tagUpperThreshold = 25; 
		tagSizeCode = 0;
	}
	if(zoomDex == 5){
		tagLowerThreshold = 15;
		tagUpperThreshold = 50;
	}
	if(zoomDex == 3){ //hours need space
		tagLowerThreshold = 11;
		tagUpperThreshold = 25;
	}
	if(zoomDex == 0){
		tagLowerThreshold = 15;
		tagUpperThreshold = 25;
	}
	tagSizeCode = 1;
	if(pLineDensity < tagLowerThreshold)tagSizeCode = 0;
	if(pLineDensity >= tagUpperThreshold)tagSizeCode = 2;
	pLineGraduationThreshold = Math.floor(maxTimeComponent(zoomDex - 1) * pLineVisibilityThreshold);
}

function forgetSubZoomTime(){
	if(zoomDex < 1)return;
	startBufTime.mss = 0;
	endBufTime.mss = 0;
	if(zoomDex < 2)return;
	startBufTime.seconds = 0;
	endBufTime.seconds = 0;
	if(zoomDex < 3)return;
	startBufTime.minutes = 0;
	endBufTime.minutes = 0;
	if(zoomDex < 4)return;
	startBufTime.hours = 0;
	endBufTime.hours = 0;
	if(zoomDex < 5)return;
	startBufTime.days = 0;
	endBufTime.days = 0;
	if(zoomDex < 6)return;
	startBufTime.months = 0;
	endBufTime.months = 0;
	if(zoomDex < 7)return;
	startBufTime.years = 0;
	endBufTime.years = 0;
}

function forgetThisSubZoomTime(t){
	if(zoomDex < 1)return;
	t.mss = 0;
	if(zoomDex < 2)return;
	t.seconds = 0;
	if(zoomDex < 3)return;
	t.minutes = 0;
	if(zoomDex < 4)return;
	t.hours = 0;
	if(zoomDex < 5)return;
	t.days = 0;
	if(zoomDex < 6)return;
	t.months = 0;
	if(zoomDex < 7)return;
	t.years = 0;
}


function depth(node){
	var d = 1;
	if(node.syncParent !== null)d += depth(node.syncParent);
	return d;
}

function monthPixelsFromPLineDensity(month){
	var bumps = Math.floor(pLineDensity / 15);
	var pixels = pLineDensity + Math.floor(bumps / 2);
	if(month == 1)pixels = pLineDensity - bumps;
	if(month == 3 || month == 5 || month == 8 || month == 10)pixels = pLineDensity;
	return pixels;
}

function generateBarTagFromPivot(pivot){
	var t = new datetime("",0,0,0,0,0,0,0,"");
	t.setTime(startBufTime);
	while(t.index != pivot){
		t.advance(zoomDex);
	}
}

function getDateFromXPos(pos){
	var t = new datetime("",0,0,0,0,0,0,0,"");	
	t.setTime(startBufTime);
	var index = 0;
	for(var i = 0; i < upperBarDex; i++){
		if(pos < barPositions[i]){
			return t.getTimeString();
		}
		t.advance(zoomDex);
		index++;
	}
	return t.getTimeString();
}

function checkTimeSync(){
	var inSync = true;
	//perform two way check, increment across entire bar array in both directions

	var time = new datetime("",0,0,0,0,0,0,0,"");
	time.setTime(startBufTime);
	while(time.index != endBufTime.index){
		time.advance(zoomDex);
	}
	if(equals(time,endBufTime) == false)return false;

	while(time.index != startBufTime.index){
		time.turnback(zoomDex);
	}
	if(equals(time,startBufTime) == false)return false;

	return inSync;
}

function datetime(e,y,mo,d,h,mi,s,ms,zn){
	this.era = e;
	this.years = y;
	this.months = mo;
	this.days = d;
	this.hours = h;
	this.minutes = mi;
	this.seconds = s;
	this.mss = ms;
	this.zone = zn;
	this.getComponent = getTimeComponent;
	this.setTime = setTime;
	this.setTimeFromSparseDatetime = setTimeFromSparseDatetime;
	this.advance = advance;
	this.turnback = turnback;
	this.adv = adv;
	this.tbk = tbk;
	this.getComponentLabel = getComponentLabel;
	this.getComponentShortLabel = getComponentShortLabel;
	this.getTimeString = getTimeString;
	this.maxDays = computeMaxDays(this);
	this.index = -1;
}

function getTimeString(){
	return this.years + '/' + (this.months + 1) + '/' + (this.days + 1) + ' ' + this.hours + ':' + this.minutes + ':' + this.seconds + '.' + this.mss + ' ' + this.zone;
}


function getTimeComponent(l){
	if(l > 3){
		if(l > 5)return this.years;
		else {
			if(l > 4)return this.months;
			else return this.days;
		}
	}
	else {
		if(l > 1){
			if(l > 2)return this.hours;
			else return this.minutes;
		}
		else {
			if(l > 0)return this.seconds;
			else return this.mss;
		}
	}
}

function setTime(t){
	this.era = t.era;
	this.years = t.years;
	this.months = t.months;
	this.days = t.days;
	this.hours = t.hours;
	this.minutes = t.minutes;
	this.seconds = t.seconds;
	this.mss = t.mss;
	this.zone = t.zone;
	this.maxDays = t.maxDays;
	this.index = t.index;
}

function setTimeFromSparseDatetime(t){
	//these sparse values are taken to be java Calendar values where indicated
	if(t.era !== undefined)this.era = t.era;
	else this.era = "AD";
	//Calendar.YEAR, zero-based???
	if(t.yr !== undefined)this.years = t.yr;
	else this.years = 0;
	//Calendar.MONTH, zero-based
	if(t.mo !== undefined)this.months = t.mo;
	else this.months = 0;
	//Calendar.DAY_OF_MONTH, one-based...convert to zero-based
	if(t.dy !== undefined)this.days = t.dy - 1;
	else this.days = 0;
	//Calendar.HOUR_OF_DAY, zero-based
	if(t.hr !== undefined)this.hours = t.hr;
	else this.minutes = 0;
	//Calendar.MINUTE, zero-based
	if(t.mn !== undefined)this.minutes = t.mn;
	else this.minutes = 0;
	//Calendar.SECOND, zero-based
	if(t.sc !== undefined)this.seconds = t.sc;
	else this.seconds = 0;
	//Calednar.MILLISECOND, zero-based
	if(t.ms !== undefined)this.mss = t.ms;
	else this.mss = 0;
	if(t.zn !== undefined)this.zone = t.zn;
	else this.zone = "";
	this.maxDays = computeMaxDays(this);
	this.index = 0;
}

function isSparseDatetime(t){
	if(t === undefined)return false;
	if(t === null)return false;
	//if(t.era === undefined)return false;
	//if(t.era === null)return false;
	//if(t.era !== "ad" && t.era !== "bc")return false;
	return true;
}

function advance(l){
	this.index++;
	this.adv(l);
}

function adv(l){
        if(l > 3){
                if(l > 5){
			if(l < 7){
				this.years += 1;
				if(this.years == 0)this.years += 1; //Julian calendar had no year 'zero', Romans had no number for zero 
				if(this.days > 26)this.maxDays = computeMaxDays(this);//adjusts this.days if exceeds max
			}
		}
                else {
			if(l > 4){
				this.months += 1;
				if(this.months > 11){
					this.months = 0;
					this.adv(l + 1);
					this.maxDays = computeMaxDays(this);//adjusts this.days if exceeds max
				}
			}
			else {
				this.days += 1;
				if(this.days > this.maxDays){
					this.adv(l + 1);
					this.maxDays = computeMaxDays(this);
					this.days = 0;
				}
			}
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				this.hours += 1;
				if(this.hours > 23){
					this.hours = 0;
					this.adv(l + 1);
				}
			}
                        else {
				this.minutes += 1;
				if(this.minutes > 59){
					this.minutes = 0;
					this.adv(l + 1);
				}
			}
                }
                else {
                        if(l > 0){
				this.seconds += 1;
				if(this.seconds > 59){
					this.seconds = 0;
					this.adv(l + 1);
				}
			}
                        else {
				this.mss += 1;
				if(this.mss > 999){
					this.mss = 0;
					this.adv(l + 1);
				}
			}
                }
        }
}

function turnback(l){
	this.index--;
	this.tbk(l);
}

function tbk(l){
        if(l > 3){
                if(l > 5){
			if(l < 7){
				this.years -= 1;
				if(this.years == 0)this.years -= 1; //Julian calendar had no year 'zero', Romans had no number for zero 
				if(this.days > 26)this.maxDays = computeMaxDays(this);//adjusts this.days if exceeds max
			}
		}
                else {
			if(l > 4){
				this.months -= 1;
				if(this.months < 0){
					this.months = 11;
					this.tbk(l + 1);
					this.maxDays = computeMaxDays(this); //adjusts this.days if exceeds max
				}
			}
			else {
				this.days -= 1;
				if(this.days < 0){
					this.tbk(l + 1);
					this.maxDays = computeMaxDays(this);
					this.days = this.maxDays;
				}
			}
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				this.hours -= 1;
				if(this.hours < 0){
					this.hours = 23;
					this.tbk(l + 1);
				}
			}
                        else {
				this.minutes -= 1;
				if(this.minutes < 0){
					this.minutes = 59;
					this.tbk(l + 1);
				}
			}
                }
                else {
                        if(l > 0){
				this.seconds -= 1;
				if(this.seconds < 0){
					this.seconds = 59;
					this.tbk(l + 1);
				}
			}
                        else {
				this.mss -= 1;
				if(this.mss < 0){
					this.mss = 999;
					this.tbk(l + 1);
				}
			}
                }
        }
}

function advanceFractionalDay(time,offset,accuracy){
	var days = Math.floor(offset);
	var level = 4;
	for(var i = accuracy; i > 0; i--){		
		for(var j = 0; j < days; j++){
			time.advance(level);
		}	
		offset = offset - (days * dayFractions[level]);
		level--;
		if(level < 0)break;
		days = Math.floor(offset / dayFractions[level]);
	}
}

function turnbackFractionalDay(time,offset,accuracy){
	var days = Math.floor(offset);
	var level = 4;
	for(var i = accuracy; i > 0; i--){		
		for(var j = 0; j < days; j++){
			time.turnback(level);
		}
		offset = offset - (days * dayFractions[level]);
		level--;
		if(level < 0)break;
		days = Math.floor(offset / dayFractions[level]);
	}
}

function getComponentLabel(l){
	if(l > 3){
		if(l > 5){
			if(l < 7){
				return this.years;
			}
		}
		else {
			if(l > 4){
				if(this.months == 0)return "January";
				if(this.months == 1)return "February";
				if(this.months == 2)return "March";
				if(this.months == 3)return "April";
				if(this.months == 4)return "May";
				if(this.months == 5)return "June";
				if(this.months == 6)return "July";
				if(this.months == 7)return "August";
				if(this.months == 8)return "September";
				if(this.months == 9)return "October";
				if(this.months == 10)return "November";
				if(this.months == 11)return "December";
			}
			else return this.days + 1;
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				if(this.hours > 11){
					if(this.hours == 12)return "12 pm";
					return (this.hours - 12) + " pm";
				}
				else {
					if(this.hours == 0)return "12 am";
					return this.hours + " am";
				}
			}
                        else {
				if(this.minutes < 10)return ":0" + this.minutes;
				return ":" + this.minutes;
			}
                }
                else {
                        if(l > 0){
				if(this.seconds < 10)return ":0" + this.seconds + ":";
				return ":" + this.seconds + ":";
			}
                        else {
				if(this.mss < 10)return ":00" + this.mss;
				if(this.mss < 100)return ":0" + this.mss;
				return ":" + this.mss;
			}
                }
        }
	return "";
}

function getComponentShortLabel(l){
	if(l > 3){
		if(l > 5){
			if(l < 7){
				var num = this.years % 100;
				if(num < 10)num = "'0" + num;
				else num = "'" + num;
				return num;
			}
		}
		else {
			if(l > 4){
				if(this.months == 0)return "Jan";
				if(this.months == 1)return "Feb";
				if(this.months == 2)return "Mar";
				if(this.months == 3)return "Apr";
				if(this.months == 4)return "May";
				if(this.months == 5)return "Jun";
				if(this.months == 6)return "Jul";
				if(this.months == 7)return "Aug";
				if(this.months == 8)return "Sep";
				if(this.months == 9)return "Oct";
				if(this.months == 10)return "Nov";
				if(this.months == 11)return "Dec";
			}
			else return this.days + 1;
		}
        }
        else {
                if(l > 1){
                        if(l > 2){
				if(this.hours > 11){
					if(this.hours == 12)return 12;
					return (this.hours - 12);
				}
				else {
					if(this.hours == 0)return 12;
					return this.hours;
				}
			}
                        else {
				if(this.minutes < 10)return ":0" + this.minutes;
				return ":" + this.minutes ;
			}
                }
                else {
                        if(l > 0){
				if(this.seconds < 10)return ":0" + this.seconds + ":";
				return ":" + this.seconds + ":";
			}
                        else {
				if(this.mss < 10)return "00" + this.mss;
				if(this.mss < 100)return "0" + this.mss;
				return this.mss;
			}
                }
        }
	return "";
}

function maxTimeComponent(l){
	if(l > 3){
		if(l > 5){
			if(l < 7){
				return 10000000;
			}
		}
		else {
			if(l > 4){
				return 12;
			}
			else return 30;
		}	
        }
        else {
                if(l > 1){
                        if(l > 2){
				return 24;
			}
                        else {
				return 60;
			}
                }
                else {
                        if(l > 0){
				return 60;
			}
                        else {
				return 1000;
			}
                }
        }
	return "";

}

function computeMaxDays(t){
	//February requires leap year calculation
	//for now:
	t.maxDays = 30;
	if(t.months == 3 || t.months == 5 || t.months == 8 || t.months == 10)t.maxDays = 29;
	if(t.months == 1){
		if(isLeapYear(t))t.maxDays = 28;
		else t.maxDays = 27;
	}
	if(t.days > t.maxDays)t.days = t.maxDays;	
	return t.maxDays;	
}

function accumulativeDaysFromMonthComponent(time){
	var m = 0;
	if(time.months !== undefined)m = time.months;
	else m = time.mo;
	if(m === NaN || m > 11 || m < 0){
		alert("accumulativeDaysFromMonthComponent() has invalid input value. Month component values are zero-based");
		return 0;
	} 
	if(m > 1 && isLeapYear())return daysReached[m] + 1;
	else return daysReached[m];
}

function isLeapYear(y){
	return false;
}

/*
function isLeapYear(y){
	if((y % 4) == 0){
		if((y % 100) == 0){
			if((y % 1000) == 0)return true;
			return false;
		}
		else return true;
	}
	else return false;
}
*/

function abbreviateYear(num){
	num = num % 100;
	if(num < 10)num = "'0" + num;
	else num = "'" + num;
	return num;
}

function equals(t1,t2){
	if(t1 === undefined || t1 === null)return false;
	if(t2 === undefined || t2 === null)return false;
	if(t1.years != t2.years)return false;
	if(t1.months != t2.months)return false;
	if(t1.days != t2.days)return false;
	if(t1.hours != t2.hours)return false;
	if(t1.seconds != t2.seconds)return false;
	if(t1.mss != t2.mss)return false;
	return true;
}


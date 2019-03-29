var timerRunning = false;
var startTime = null;
var timeInterval = null;
var audioInitialzed = false;
var beginClimbWithoutTimeCallAudio = null;
var beginClimbWithTimeCallAudio = null;
var beginTransitionAudio = null;
var oneMinuteWarningAudio = null;
var tenSecondWarningAudio = null;
var test = false;
var lastLocalDateTime = null;
var clockDrift = 0.0;

$(document).ready(function() {
    beginClimbWithoutTimeCallAudio = document.getElementById('beginClimbWithoutTimeCallAudio');
    beginClimbWithTimeCallAudio = document.getElementById('beginClimbWithTimeCallAudio');
    beginTransitionAudio = document.getElementById('beginTransitionAudio');
    oneMinuteWarningAudio = document.getElementById('oneMinuteWarningAudio');
    tenSecondWarningAudio = document.getElementById('tenSecondWarningAudio');
    

    // Grab the test value from the url to see if we are in test mode
    var url = new URL(window.location.href);
    test = url.searchParams.get('test');
    if (test) {
        console.log('Starting in test mode');
    }

    setClimbTimeSeconds(url.searchParams.get('climbTimeSeconds'));
    setTransitionTimeSeconds(url.searchParams.get('transitionTimeSeconds'));
    setCompStartTime(url.searchParams.get('compStartTime'));

    // Update the end time if its not currently running
    $('#climbTimeSeconds').change(function() {
        console.log('climbTimeSeconds changed');
        setStartTimeFromCompTime();
        writeParametersIntoURL();
    });

    // Update the end time if its not currently running
    $('#transitionTimeSeconds').change(function() {
        console.log('transitionTimeSeconds changed');
        setStartTimeFromCompTime();
        writeParametersIntoURL();
    });

    // Update the end time if its not currently running
    $('#compStartTime').change(function() {
        console.log('startTime changed');
        setStartTimeFromCompTime();
        writeParametersIntoURL();
    });

    setStartTimeFromCompTime();
});

function writeParametersIntoURL() {
    var url = new URL(window.location.href);
    console.log('url before: ' + url);
    url.searchParams.set('climbTimeSeconds', getClimbTimeSeconds().toString());
    url.searchParams.set('transitionTimeSeconds', getTransitionTimeSeconds().toString());
    url.searchParams.set('compStartTime', getCompStartTime());
    console.log('url after: ' + url);
    window.history.pushState('', 'Climber Countdown', url);
}

function setClockDrift() {
    // Need a mechanism to set clock drift
}

function getSecondsFromStart() {
    return (moment().diff(startTime) + clockDrift) / 1000;
}

function getRemainingSeconds(secondsFromStart) {
    return Math.ceil(secondsFromStart % (getClimbTimeSeconds() + getTransitionTimeSeconds()));
}

function inTransition(secondsFromStart) {
    var remainingSeconds = getRemainingSeconds(secondsFromStart);
    return (getClimbTimeSeconds() < remainingSeconds);
}

function setClimbTimeSeconds(climbTimeSeconds) {
    if (climbTimeSeconds) {
        $('#climbTimeSeconds').val(climbTimeSeconds);
    }
}

function getClimbTimeSeconds() {
    var climbTimeSeconds = $('#climbTimeSeconds').val();
    if (!climbTimeSeconds) {
        return 0;
    }
    return parseInt(climbTimeSeconds);
}

function setTransitionTimeSeconds(transitionTimeSeconds) {
    if (transitionTimeSeconds) {
        $('#transitionTimeSeconds').val(transitionTimeSeconds);
    }
}

function getTransitionTimeSeconds() {
    var transitionTimeSeconds = $('#transitionTimeSeconds').val();
    if (!transitionTimeSeconds) {
        return 0;
    }
    return parseInt(transitionTimeSeconds);
}

function setCompStartTime(compStartTime) {
    if (compStartTime) {
        $('#compStartTime').val(compStartTime);
    }
}

function getCompStartTime() {
    return $('#compStartTime').val();
}

function setStartTimeFromCompTime() {
    startTime = moment();

    var compStartTimeString = getCompStartTime();
    if (!compStartTimeString) {
        return;
    }

    var compStartTimeComponents = compStartTimeString.split(':');
    if (compStartTimeComponents.length != 2) {
        alert('Error comp time of ' + compStartTimeString + ' is not in valid format of MM:HH (24 hour)');
        return;
    }

    // Put the hour and minute and second into the time components
    startTime.hour(parseInt(compStartTimeComponents[0]));
    startTime.minute(parseInt(compStartTimeComponents[1]));
    startTime.second(0);

    // Move it one day back if the startTime is now in the future
    if (startTime > moment()) {
        console.log("Moving start time: " + startTime + " as current moment: " + moment())
        startTime.subtract(1, 'days');
    }
    console.log('CompStartTime: ' + startTime.format());
}

function displayTimeRemaining(secondsFromStart) {
    var remainingSeconds = getRemainingSeconds(secondsFromStart);
    var isInTransition = inTransition(secondsFromStart);
    // console.log('displayTimeRemaining ' + isInTransition + ' ' + remainingSeconds);

    // Time is counting up so we need to get a decrementing value
    if (isInTransition) {
        remainingSeconds -= getClimbTimeSeconds();
        remainingSeconds = getTransitionTimeSeconds() - remainingSeconds;
    } else {
        remainingSeconds = getClimbTimeSeconds() - remainingSeconds;
    }

    // We want the timer to end on 1 and start at the full alloted time
    remainingSeconds += 1;

    var minutes = Math.floor(remainingSeconds / 60);
    var seconds = remainingSeconds % 60;

    var displayString = minutes + ":";
    if (seconds < 10) {
        displayString += '0' + seconds;
    } else {
        displayString += seconds;
    }

    $('#time').html(displayString);
    if (!isInTransition && remainingSeconds <= 60) {
        $('#time').addClass('timelow');
    } else {
        $('#time').removeClass('timelow');
    }
}

function setButtonText() {
    if (timerRunning) {
        $('#startStopButton').html('Stop');
    } else {
        $('#startStopButton').html('Start');
    }
}

function setTimePeriod(secondsRemaining) {
    if (inTransition(secondsRemaining)) {
        $('#timePeriod').html('Transition');
        $('#time').addClass('transition');
    } else {
        $('#timePeriod').html('Climb');
        $('#time').removeClass('transition');
    }
}

function isTransitionTimeSet() {
    return getTransitionTimeSeconds() > 0;
}

function playTimeUpAudio(secondsFromStart) {
    var isInTransition = inTransition(secondsFromStart);

    if (isInTransition) {
        beginTransitionAudio.play();
    } else {
        if (isTransitionTimeSet()) {
            beginClimbWithoutTimeCallAudio.play();
        } else {
            beginClimbWithTimeCallAudio.play();
        }
    }
}

function playTimeWarningAudio(secondsFromStart) {
    var isInTransition = inTransition(secondsFromStart);
    var remainingSeconds = getRemainingSeconds(secondsFromStart);
    // console.log('playTimeWarningAudio ' + isInTransition + ' ' + remainingSeconds);

    if (!isInTransition && getClimbTimeSeconds() - remainingSeconds + 1 == 10) {
        tenSecondWarningAudio.play();
    } else if (!isInTransition && getClimbTimeSeconds() - remainingSeconds + 1 == 60) {
        oneMinuteWarningAudio.play();
    }
}

// iOS will not play audio unless it has been initialized via button press
// This hack will play all the audio muted once for the first button press
// so its availble afterwards
function initializeAudio() {
    if (!audioInitialzed) {
        // beginClimbWithoutTimeCallAudio = document.getElementById('beginClimbWithoutTimeCallAudio');
        // beginClimbWithTimeCallAudio = document.getElementById('beginClimbWithTimeCallAudio');
        // beginTransitionAudio = document.getElementById('beginTransitionAudio');
        // oneMinuteWarningAudio = document.getElementById('oneMinuteWarningAudio');
        // tenSecondWarningAudio = document.getElementById('tenSecondWarningAudio');
    
        // beginClimbWithoutTimeCallAudio = new Audio('./BeginClimbWithoutTimeCall.wav');
        // beginClimbWithTimeCallAudio = new Audio('./BeginClimbWithTimeCall.wav');
        // beginTransitionAudio = new Audio('./BeginTransition.wav');
        // oneMinuteWarningAudio = new Audio('./OneMinuteWarning.wav');
        // tenSecondWarningAudio = new Audio('./TenSecondWarning.wav');

        // beginClimbWithoutTimeCallAudio.load();
        // beginClimbWithTimeCallAudio.load();
        // beginTransitionAudio.load();
        // oneMinuteWarningAudio.load();
        // tenSecondWarningAudio.load();

        beginClimbWithoutTimeCallAudio.play();
        beginClimbWithTimeCallAudio.play();
        beginTransitionAudio.play();
        oneMinuteWarningAudio.play();
        tenSecondWarningAudio.play();
    }
    audioInitialzed = true;
}

function logTestResults() {
    if (!test) {
        return;
    }
    
    var currentLocalDateTime = moment();
    if (!lastLocalDateTime) {
        lastLocalDateTime = currentLocalDateTime;
    }
    if (lastLocalDateTime) {
        // Do not log if less than 2 seconds ago
        if (currentLocalDateTime.diff(lastLocalDateTime) > 2000) {
            console.log(currentLocalDateTime - lastLocalDateTime);
            lastLocalDateTime = currentLocalDateTime
        }
    }
}

function isTimeUp(secondsFromStart) {
    var isInTransition = inTransition(secondsFromStart);
    var remainingSeconds = getRemainingSeconds(secondsFromStart);
    // console.log(isInTransition + ' ' + remainingSeconds);

    if(isInTransition && remainingSeconds == getClimbTimeSeconds() + 1 ||
       !isInTransition && remainingSeconds == 1) {
        return true;
    }
    return false;
}
function startStopButtonPressed() {
    initializeAudio();  

    if (timerRunning) {
        timerRunning = false;
        clearInterval(timeInterval);
        setTimePeriod();
        setButtonText();
    } else {
        timerRunning = true;
        setTimePeriod();
        setButtonText();

        timeInterval = setInterval(function(){
            var secondsFromStart = getSecondsFromStart();
            playTimeWarningAudio(secondsFromStart);
            displayTimeRemaining(secondsFromStart);
            setTimePeriod(secondsFromStart);

            if(isTimeUp(secondsFromStart)) {
                // console.log('TimeUP!');
                playTimeUpAudio(secondsFromStart);
                logTestResults();
            }
        },100);
    }
}

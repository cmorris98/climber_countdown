var timerRunning = false;
var sountTestTimerRunning = false;
var soundTestTimeInterval = null;
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
var noSleep = null;

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

    // Udate the start time if the user has changed the climb time
    $('#climbTimeSeconds').change(function() {
        console.log('climbTimeSeconds changed');
        setStartTimeFromCompTime();
        writeParametersIntoURL();
    });

    // Udate the start time if the user has changed the transtition time
    $('#transitionTimeSeconds').change(function() {
        console.log('transitionTimeSeconds changed');
        setStartTimeFromCompTime();
        writeParametersIntoURL();
    });

    // Udate the start time if the user has changed the comp start time
    $('#compStartTime').change(function() {
        console.log('startTime changed');
        setStartTimeFromCompTime();
        writeParametersIntoURL();
    });

    setStartTimeFromCompTime();

    // Set the clock drift right away and then 30 second invervals
    setClockDrift();
    setInterval(function(){
        setClockDrift();
    },30000);

    // Create an object that will prevent mobile browsers from sleeping
    noSleep = new NoSleep();

    // Update the qr code image to what is in the url
    updateQRCodeUrl();
});

function writeParametersIntoURL() {
    var url = new URL(window.location.href);
    url.searchParams.set('climbTimeSeconds', getClimbTimeSeconds().toString());
    url.searchParams.set('transitionTimeSeconds', getTransitionTimeSeconds().toString());
    url.searchParams.set('compStartTime', getCompStartTime());
    window.history.pushState(null, null, url);
    updateQRCodeUrl();
}

function updateQRCodeUrl() {
    // var climbTimeSeconds = getClimbTimeSeconds().toString();
    // var transitionTimeSeconds = getTransitionTimeSeconds().toString();
    // var compStartTime = getCompStartTime().replace(':', '%3a');
    // var url = `https://chart.googleapis.com/chart?cht=qr&chs=400x400&chl=https://climbercountdown.com/?climbTimeSeconds=${climbTimeSeconds}%26transitionTimeSeconds=${transitionTimeSeconds}%26compStartTime=${compStartTime}`;
    var url = `https://chart.googleapis.com/chart?cht=qr&chs=400x400&chl=${encodeURI(window.location.href)}`;
    console.log(`QRCode URL: ${url}`);
    $("#qrCodeImage").attr("src",url);
}

function getSecondsFromStart() {
    return moment().diff(startTime) / 1000;
}

function getRemainingSeconds(secondsFromStart) {
    return Math.ceil(secondsFromStart % (getClimbTimeSeconds() + getTransitionTimeSeconds()));
}

function inTransition(secondsFromStart) {
    var remainingSeconds = getRemainingSeconds(secondsFromStart);
    return (getClimbTimeSeconds() < remainingSeconds || !compStarted(secondsFromStart));
}

function compStarted(secondsFromStart) {
    return secondsFromStart > 0;
}

function setClimbTimeSeconds(climbTimeSeconds) {
    if (climbTimeSeconds) {
        $('#climbTimeSeconds').val(climbTimeSeconds);
        writeParametersIntoURL();
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
    if (transitionTimeSeconds != null) {
        $('#transitionTimeSeconds').val(transitionTimeSeconds);
        writeParametersIntoURL();
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
        writeParametersIntoURL();
    }
}
 
function getCompStartTime() {
    return $('#compStartTime').val();
}

// First climbers should be out at the climb time plus transition time
function getSecondsToStartTransitionFromISO() {
    return getClimbTimeSeconds() + getTransitionTimeSeconds();
}

function setClockDrift() {
    var requestDate = new Date();
    var url = `https://us-central1-golden-torch-153105.cloudfunctions.net/clockDrift?userDateTimeUST=${new Date().toISOString()}`;
    $.ajax({
        url: url,
        type: 'GET',
        success: function(res) {
            console.log(`setClockDrift: Success ${JSON.stringify(res)}`);
            var roundTripTime = (new Date() - requestDate) + res.functionExecutionTime;
            var calculatedClockDrift = 0.0;
            if (res.clockDrift < 0) {
                calculatedClockDrift = res.clockDrift + roundTripTime / 2.0;
            } else {
                calculatedClockDrift = res.clockDrift - roundTripTime / 2.0;
            }
            $('#clockDrift').html('Clock Drift: (' + calculatedClockDrift + ')');
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log('setClockDrift: Error ' + errorThrown);
        }
    });
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

    console.log('CompStartTime: ' + startTime.format());
}

function displayTimeRemaining(secondsFromStart) {
    var remainingSeconds = getRemainingSeconds(secondsFromStart);
    var isInTransition = inTransition(secondsFromStart);
    // console.log(`displayTimeRemaining secondsFromStart: ${secondsFromStart} isInTransition: ${isInTransition}, remainingSeconds: ${remainingSeconds}`);

    if (compStarted(secondsFromStart)) {
        // Time is counting up so we need to get a decrementing value
        if (isInTransition) {
            remainingSeconds -= getClimbTimeSeconds();
            remainingSeconds = getTransitionTimeSeconds() - remainingSeconds;
        } else {
            remainingSeconds = getClimbTimeSeconds() - remainingSeconds;
        }

        // We want the timer to end on 1 and start at the full alloted time
        remainingSeconds += 1;
        // console.log(`displayTimeRemaining compStarted secondsFromStart: ${secondsFromStart} isInTransition: ${isInTransition} remainingSeconds: ${remainingSeconds}`);

        var minutes = Math.floor(remainingSeconds / 60);
        var seconds = remainingSeconds % 60;

        var displayString = `${minutes}:`;
        if (seconds < 10) {
            displayString += `0${seconds}`;
        } else {
            displayString += seconds;
        }

        $('#time').html(displayString);
        if (!isInTransition && remainingSeconds <= 60) {
            $('#time').addClass('timelow');
        } else {
            $('#time').removeClass('timelow');
        }
    } else {
        // Comp has not yet started so display a total countdown
        var minutes = Math.floor(Math.abs(secondsFromStart) / 60);
        var seconds = Math.floor(Math.abs(secondsFromStart) % 60);
        // console.log(`displayTimeRemaining compNotStarted secondsFromStart: ${secondsFromStart} isInTransition: ${isInTransition} remainingSeconds: ${remainingSeconds} minutes: ${minutes} seconds: ${seconds}`);
        var displayString = `${minutes}:`;
        if (seconds < 10) {
            displayString += `0${seconds}`;
        } else {
            displayString += seconds;
        }

        $('#time').html(displayString);
        $('#time').removeClass('transition');
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

function setSoundTestButtonText() {
    if (sountTestTimerRunning) {
        $('#soundTestButton').html('Stop Test');
    } else {
        $('#soundTestButton').html('Sound Test');
    }
}

function setTimePeriod(secondsRemaining) {
    var transitionTimeSeconds = getTransitionTimeSeconds();

    if (secondsRemaining < 0 - transitionTimeSeconds - 1) {
        var notificationString = `Climbing starts at ${getCompStartTime()}`;
        notificationString += `<br>Current Time: ${moment().format('HH:mm')}`;
        // Add a notification that climbers should be in chairs we if have climbing + 30 seconds to go from
        // the comp start
        if (Math.abs(secondsRemaining) <= getSecondsToStartTransitionFromISO()) {
            notificationString += `<br> First climbers in chairs`;
        } else {
            notificationString += `<br> All climbers in ISO`;
        }
        $('#timePeriod').html(notificationString);
        $('#time').removeClass('transition');
        $('#timePeriod').addClass('information');
    } else if (inTransition(secondsRemaining)) {
        $('#timePeriod').html('Transition');
        $('#time').addClass('transition');
        $('#timePeriod').removeClass('information');
    } else {
        $('#timePeriod').html('Climb');
        $('#time').removeClass('transition');
        $('#timePeriod').removeClass('information');
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
    if (compStarted(secondsFromStart)) {
        var isInTransition = inTransition(secondsFromStart);
        var remainingSeconds = getRemainingSeconds(secondsFromStart);
        // console.log(`playTimeWarningAudio compStarted secondsFromStart: ${secondsFromStart} isInTransition: ${isInTransition} remainingSeconds: ${remainingSeconds}`);

        if (!isInTransition && getClimbTimeSeconds() - remainingSeconds + 1 == 10) {
            tenSecondWarningAudio.play();
        } else if (!isInTransition && getClimbTimeSeconds() - remainingSeconds + 1 == 60) {
            oneMinuteWarningAudio.play();
        }
    } else {
        // The comp has not yet started, so play audio as needed 
        // If there is no transition then call out the time to come out from ISO plus a one minute and 10 second
        // If there is a transition then call out
        var remainingSeconds = Math.ceil(secondsFromStart);
        var hasTransition = getTransitionTimeSeconds() > 0;
        // console.log(`playTimeWarningAudio compNotStarted secondsFromStart: ${secondsFromStart}, remainingSeconds: ${remainingSeconds}`);

        var transitionTimeSeconds = getTransitionTimeSeconds();
        if (remainingSeconds == -10 - transitionTimeSeconds) {
            tenSecondWarningAudio.play();
        } else if (remainingSeconds == -60 - transitionTimeSeconds) {
            oneMinuteWarningAudio.play();
        } else if (remainingSeconds == -getSecondsToStartTransitionFromISO()) {
            beginTransitionAudio.play();
        } else if (hasTransition && remainingSeconds == -transitionTimeSeconds) {
            beginTransitionAudio.play();
        }
    }
}

function playAllAudio() {
    beginClimbWithoutTimeCallAudio.play();
    beginClimbWithTimeCallAudio.play();
    beginTransitionAudio.play();
    oneMinuteWarningAudio.play();
    tenSecondWarningAudio.play();
}

// iOS will not play audio unless it has been initialized via button press
// This hack will play all the audio muted once for the first button press
// so its availble afterwards
function initializeAudio() {
    if (!audioInitialzed) {
        playAllAudio();
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
        noSleep.disable();
    } else {
        timerRunning = true;
        noSleep.enable();
        hideSettingsContent();
        setTimePeriod();
        setButtonText();

        timeInterval = setInterval(function(){
            var secondsFromStart = getSecondsFromStart();
            playTimeWarningAudio(secondsFromStart);
            displayTimeRemaining(secondsFromStart);
            setTimePeriod(secondsFromStart);

            if(isTimeUp(secondsFromStart)) {
                playTimeUpAudio(secondsFromStart);
                logTestResults();
            }
        },100);
    }
}

function hideSettingsContent() {
    $('#settingsContent').collapse('hide');
}

function adjustClimbSeconds(adjustmentSeconds) {
    var climbTimeSeconds = getClimbTimeSeconds() + adjustmentSeconds;
    setClimbTimeSeconds(climbTimeSeconds);
}

function adjustTransitionTimeSeconds(adjustmentSeconds) {
    var transitionTimeSeconds = Math.max(getTransitionTimeSeconds() + adjustmentSeconds, 0);
    setTransitionTimeSeconds(transitionTimeSeconds);
}

function adjustCompStartTime(adjustmentMinutes) {
    startTime.add(adjustmentMinutes, 'minutes');
    setCompStartTime(startTime.format('HH:mm'));
}

function soundTestButtonPressed() {
    initializeAudio();  

    if (sountTestTimerRunning) {
        sountTestTimerRunning = false;
        clearInterval(soundTestTimeInterval);
        setSoundTestButtonText();
    } else {
        sountTestTimerRunning = true;
        setSoundTestButtonText();

        soundTestTimeInterval = setInterval(function(){
            tenSecondWarningAudio.play();
        },100);
    }
}

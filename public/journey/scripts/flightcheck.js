Modernizr.addTest('webaudio', function() {
    var prefixed = 'webkitAudioContext' in window;
    var unprefixed = 'AudioContext' in window;
    return prefixed || unprefixed;
});

var flightCheck = {};
var browser = Detectizr.browser;

if (document.location.search != '?continue=true') {

    // not detected directly - if features aren't supported, but we know the browser in theory supports them, then we might
    // need a webgl driver update.
    flightCheck.browserSupported =  (browser.name == 'chrome' && parseInt(browser.major) >= 30) ||
                                    (browser.name == 'safari' && parseInt(browser.major) >= 8) ||
                                    (browser.name == 'firefox' && parseInt(browser.major) >= 24) ||
                                    (browser.name == 'ie' && parseInt(browser.major) >= 10);

    // master check - add any required features here
    flightCheck.featuresSupported = Modernizr.webgl && Modernizr.csstransforms3d;

    flightCheck.message = '';

    if (!flightCheck.featuresSupported) {
        // we're missing required features!
        if (flightCheck.browserSupported) {
            // features are missing, but the browser is supported... probably webgl and requires a driver update or
            // more recent gpu
            flightCheck.message = '<p>Sorry. It appears you need to update your computer&rsquo;s graphics drivers ' +
            'before viewing <em>The Boat</em>.</p>';
        } else {
            // features are missing, and the browser is a dud
            flightCheck.message = '<p>Sorry. Your browser is missing features required to view <em>The Boat</em>. The site ' +
            'supports these platforms: </p>' +
            '<h2>Windows, Apple OS X and Linux</h2>' +
            '<ul>' +
                '<li>Internet Explorer 10+</li>' +
                '<li>Chrome 30+</li>' +
                '<li>Safari 8+</li>' +
                '<li>Firefox 24+</li>' +
            '</ul>' +
            '<h2>Tablet devices</h2>' +
            '<ul>' +
                '<li>Android Chrome 30+</li>' +
                '<li>iOS Safari 8+</li>' +
            '</ul>';
        }
        document.body.innerHTML =   '<div class="error">' + flightCheck.message +
                                        '<p class="continue"><a href="' + document.location.href + '?continue=true">Continue anyway?</a></p>' +
                                    '</div>';
    }
} else {
    flightCheck.browserSupported = true;
    flightCheck.featuresSupported = true;
}

# Computest Openrunner
[![Build Status](https://travis-ci.org/computestdev/Openrunner.svg?branch=master)](https://travis-ci.org/computestdev/Openrunner) [![Coverage Status](https://coveralls.io/repos/github/computestdev/Openrunner/badge.svg?branch=master)](https://coveralls.io/github/computestdev/Openrunner?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/computestdev/Openrunner.svg)](https://greenkeeper.io/)

Openrunner can be used for benchmark and functional testing for frontend-heavy web applications. It's a tool that simulates an end user using a website. It simulates user behaviour (keyboard/mouse activity) to browse through an online application. This can be used to test functionality and/or response times. Openrunner is a browser extension but can also be run from the command line i.e. for integration in a build pipeline.

## What is Openrunner?
Openrunner is a browser-extension that can simulate an end user within a real browser. This is useful for automated functional testing or performance benchmarking. It measures DOM-changes directly so it is able to measure response and processing times in the browser very exact. 

## Who is it for?

__Performance testers__

Openrunner is useful for performance testers who wants to measure the real end user response times in the browser. Traditional performance test tools only measures the end-to-end request-response times between client and server and browser processing is not included. Truclient in Loadrunner tries to approach this but it does not include the complete rendering and processing that a real browser does.
There are also some other tools that integrates with Selenium and tries to measure real browser response times. But using Selenium you are not capable of measuring exact response times including browser processing and rendering. Openrunner gives you the opportunity to measure accurate response times including processing and rendering of the page from a real browser.

__Front End Developers__

Front End developers never had a tool to benchmark their developed pages and changes to it. With Openrunner it is possible to benchmark your pages including processing and rendering like never before. For example, javascript processing can take long, or you have a lot of render blocking, it is all included in the total response time of your page. It's also measure response times for Single Page Applications. This performance feedback is very valuable during development.

__Test Automation Engineer__

Openrunner scripts can simulate a user as fast as possible and therefor very efficient. In some cases it is not possible (or easy) with Selenium to test certain pages or applications, like Single Page Applications. Or people include wait times between steps so the browser had time to process the prior request, what will end up in much longer simulation times. With Openrunner this is not necessary as it instantly knows that the DOM was changes and can continue simulating the user. As a bonus you get accurate response times. 

## Situation

__Front end heavy website__

Most todays websites push more logic and therefor processing power to the client. Pages get much more javascript intensive. Therefor benchmarking end-to-end request-response times are not sufficient anymore. The processing and rendering in the browser takes a significant amount of time and impacts the end user experience.

Because Openrunner is a browser extension and simulates a user from within the browser it is capable of measuring the complete end user response time and experience which is very important for front end heavy websites.

__Continuous Integration / Continuous Deployment pipeline__

With it's command line features it easy to integrate Openrunner in your CI/CD pipeline.

__Agile development / Continuous Integration / Continuous Development__

Openrunner can be used with agile development as it can quickly notice performance impact on any changes. Not only back end changes, but also front end changes like heavier running javascripts or slow draws. It is also useful to verify functionality and verify if all elements are loaded properly on the page. 

## Free and open source

Openrunner is free and open source. You can use it freely and we encourage the community to collaborate on improving Openrunner. We want to make sure that Openrunner is easy to implement in existing environments and useful for everyone.

## Getting started:

First of all, because this project is not an official browser extension yet, you will have to download and install Firefox Nightly: [https://nightly.mozilla.org/](https://nightly.mozilla.org/) (You can also use Firefox "Unbranded" or "Developer Edition", but not the regular firefox).

Then you must make sure that you have node.js installed (version 8 or higher): [https://nodejs.org/en/download/](https://nodejs.org/en/download/).

You can now install Openrunner using your terminal:

```bash
npm install --global openrunner@latest
```

Using a different command you can open the Openrunner IDE whenever you would like to use it:

```bash
openrunner-ide --firefox '/Applications/Firefox Nightly.app/Contents/MacOS/firefox'
```
(Update the path to firefox as needed)

After starting you'll see Firefox with an icon of a running person in the menu bar, click this to launch the Openrunner browser extension.

Openrunner will launch with a small example script to get you started. The buttons on top of the screen can be used to open or save a script, execute or stop it. The two numbers are for the interval and the amount of runs you'd like to do (by default it's set to 1 run every 60 seconds), the last field is the current status.

After executing a script you'll be presented with the outcome. The top half of the screen shows the measured response times per step, and errors when/if they occur.

The bottom half of the screen shows the result of the run in json-format. Also, there's a 'view breakdown' button, this will open a complete breakdown of every step/event/object loaded that happened during the script execution.

Much more documentation on how to create scripts is available on the wiki on github: https://github.com/computestdev/Openrunner/wiki/Scripting-guide-(with-examples)

## Running scripts using your terminal
Assuming Openrunner has been installed (see [Getting started](#getting-started)), you can run saved scripts using your terminal:

```bash
openrunner --firefox '/Applications/Firefox Nightly.app/Contents/MacOS/firefox' --script myScript.js --result myResult.json --headless
``` 

After this command has completed, you can inspect/parse all the results in the `myResult.json` file.

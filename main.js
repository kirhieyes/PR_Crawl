"use strict";
const schedule = require("node-schedule");
const moment = require("moment");
const axios = require('axios');
const puppeteer = require("puppeteer");
const request = require('request');

let currRound = -1;
let currTurn = -1;
let currDonghang = -1;
let currPBall = -1;
let currNBalls = "";
let currNBallSum = -1;
let browser;
let page;
let callNum = 0;
let bSend = false;

StartCrawl();

async function StartCrawl() {
    console.log(">>>>>>>>>>>>>>>>>>>>> startCrawl - API <<<<<<<<<<<<<<<<<<<<<");
    browser = await puppeteer.launch({
        headless: true,
        timeout: 5000,
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ["--mute-audio", "--fast-start", "--disable-extensions", "--disable-setuid-sandbox", "--no-sandbox"],
        ignoreHTTPSErrors: true,
    });        

    page = await browser.newPage();

    schedule.scheduleJob("40 4-59/5 * * * *", async function () {
        var time = Number(moment().format("HHmm"));
        
        if(time > 600) {
            bSend = false;
            callNum = 0;
            currRound = Math.ceil((moment().hours() * 60 + moment().minutes()) / 5);
            currTurn = Number(moment().format("YYMMDDHHmm"));
            currPBall = -1;
            currNBalls = "";
            currNBallSum = -1;
            if(currRound === 72) return;
            RunPowerball();
            RunChance();
        }
    });

    schedule.scheduleJob("5 */5 * * * *", async function () {
        var time = Number(moment().format("HHmm"));
        
        if(time > 0 && time <= 600) {
            bSend = false;
            callNum = 0;
            currRound = Math.ceil((moment().hours() * 60 + moment().minutes()) / 5);
            currTurn = Number(moment().format("YYMMDDHHmm"));
            currPBall = -1;
            currNBalls = "";
            currNBallSum = -1;
            if(currRound === 72) return;
            RunEOS();
        }
    });
};

// 베픽 파워볼
async function RunPowerball() {
    if(callNum > 10) {
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getBepickPowerball(timestamp).then(response => {
        if(response != null){
            let data = response.data.update;
            if(data.round === currRound){
                currPBall = data.pb;
                currNBalls = data.b1 + "|" + data.b2 + "|" + data.b3 + "|" + data.b4 + "|" + data.b5;
                currNBallSum = data.bsum;
                currDonghang = data.rownum;
                SendData();
            }else{
                callNum++;
                RunPowerball__();
            }
        }else{
            callNum++;
            RunPowerball__();
        }
    }).catch(error => {
        console.log("베픽 파워볼 조회 실패");
        callNum++;
        if(currPBall === -1) RunPowerball__();
    });
}

// 베픽 eos
async function RunEOS() {    
    if(callNum > 10) {
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getBepickEOS(timestamp).then(response => {
        if(response != null){
            let data = response.data.update;
            if(data.round === currRound){
                currPBall = data.pb;
                currNBalls = data.b1 + "|" + data.b2 + "|" + data.b3 + "|" + data.b4 + "|" + data.b5;
                currNBallSum = data.bsum;
                currDonghang = 0;
                SendData();
            }else{
                callNum++;
                RunEOS__();
            }
        }else{
            callNum++;
            RunEOS__();
        }
    }).catch(error => {
        console.log("베픽 EOS 조회 실패");
        callNum++;
        if(currPBall === -1) RunEOS__();
    });
}

// 엔트리 파워볼
async function RunPowerball__() {
    if(callNum > 10) {
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getEntryPowerball(timestamp).then(response => {
        if(response != null){
            let data = response.data;
            if(data.date_round === currRound){
                currPBall = Number(data.ball[5]);
                currNBalls = data.ball[0] + "|" + data.ball[1] + "|" + data.ball[2] + "|" + data.ball[3] + "|" + data.ball[4];
                currNBallSum = data.def_ball_sum;
                currDonghang = data.times;
                SendData();
            }else{
                callNum++;
                RunPowerball();
            }
        }else{
            callNum++;
            RunPowerball();
        }
    }).catch(error => {
        console.log("엔트리 파워볼 조회 실패");
        callNum++;
        if(currPBall === -1) RunPowerball();
    });
}

// 엔트리 eos
async function RunEOS__() {    
    if(callNum > 10) {
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getEntryEOS(timestamp).then(response => {     
        if(response != null)   {
            let data = response.data;
            if(data.date_round === currRound){
                currPBall = Number(data.ball[5]);
                currNBalls = data.ball[0] + "|" + data.ball[1] + "|" + data.ball[2] + "|" + data.ball[3] + "|" + data.ball[4];
                currNBallSum = data.def_ball_sum;
                currDonghang = 0;
                SendData();
            }else{
                callNum++;
                RunEOS();
            }
        }else{
            callNum++;
            RunEOS();
        }
    }).catch(error => {
        console.log("엔트리 EOS 조회 실패");
        callNum++;
        if(currPBall === -1) RunEOS();
    });
}

// 보험 우리볼
async function RunChance() {
    try {
        await page.goto("https://www.wooriball.com/game_powerball.php");                    // 우리볼 5분 파워볼
        const frame = await page.frames().find(frame => frame.name() === "lecture2");
        await sleep(1000);
        if(!frame) {
            throw new Error("프레임 못찾음");
        }
    
        
        let roundStr = await frame.$eval('#round-history > tr:nth-child(1) > td:nth-child(1)', element => element.textContent);         // 1112606 (206)
        let roundArr = roundStr.split(' ');
        let roundDong = Number(roundArr[0].trim());
        let roundStr1 = roundArr[1].replace('(', '');
        let roundStr2 = roundStr1.replace(')', '');
        let round = Number(roundStr2);
        let ballStr = await frame.$eval('#round-history > tr:nth-child(1) > td:nth-child(6)', element => element.textContent);          // 24 8 4 28 18
        let ballArr = ballStr.split(' ');
        
        let ball1 = Number(ballArr[0]);
        let ball2 = Number(ballArr[1]);
        let ball3 = Number(ballArr[2]);
        let ball4 = Number(ballArr[3]);
        let ball5 = Number(ballArr[4]);        
        let pBall = Number(await frame.$eval('#round-history > tr:nth-child(1) > td:nth-child(2)', element => element.textContent));     // 9

        if(round === currRound){
            currPBall = pBall;
            currNBalls = ball1 + "|" + ball2 + "|" + ball3 + "|" + ball4 + "|" + ball5;
            currNBallSum = ball1 + ball2 + ball3 + ball4 + ball5;
            currDonghang = roundDong;
            SendData();
        }
    } catch (err) {        
        console.log("우리볼 파워볼 조회 실패");
    }
}


const getBepickPowerball = async (timestamp) => {
    try {
        return await axios.get("https://bepick.net/api/get_pattern/nlotto_power/default/fd1/20", {
            params: {
                _: timestamp
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("베픽 파워볼 axios 실패");
    }
};

const getBepickEOS = async (timestamp) => {
    try {
        return await axios.get("https://bepick.net/api/get_pattern/eosball5m/default/fd1/20", {
            params: {
                _: timestamp
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("베픽 EOS axios 실패");
    }
};

const getEntryPowerball = async (timestamp) => {
    try {
        return await axios.get("http://ntry.com/data/json/games/powerball/result.json", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("엔트리 파워볼 axios 실패");
    }
};

const getEntryEOS = async (timestamp) => {
    try {
        return await axios.get("http://ntry.com/data/json/games/eos_powerball/5min/result.json", {
            params: {
                _: timestamp
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("엔트리 EOS axios 실패");
    }
};

const getLastPowerball = async (round) => {
    try {
        return await axios.get("https://bepick.net/api/get_more/nlotto_power/default/" + round, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("베픽 LAST 파워볼 axios 실패");
    }
};

const getLastEOS = async (round) => {
    try {
        return await axios.get("https://bepick.net/api/get_more/eosball5m/default/" + round, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("베픽 LAST EOS axios 실패");
    }
};

function SendData () {
    if(bSend) return;
    
    try {
        const options = {
            uri: "http://165.76.184.119:3000/race/setCrawlData",
            method: 'POST',
            form: {
                turn: currTurn.toString(),
                donghang: currDonghang.toString(),
                round: currRound.toString(),
                ball: currPBall.toString(),
                pBall: currPBall.toString(),
                nBalls : currNBallSum,
                nBall: currNBallSum.toString()
            }
        }
    
        request(options, function(err, res, body) {
            if(res && res.statusCode === 200){
                bSend = true;
                console.log(">>>>>>>> " + currRound + " 결과 전송 성공 : [ 파워볼 : " + currPBall + ", 일반볼합 : " + currNBallSum + " ]");
            }else{
                console.log(">>>>>>>> " + currRound + " 결과 전송 실패");
            }
        });
    } catch (err) {
        console.log(err);
    }
}

function sleep (sec) {
    return new Promise((resolve) => setTimeout(resolve, sec));
}
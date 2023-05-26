"use strict";
const schedule = require("node-schedule");
const moment = require("moment");
const axios = require('axios');
const puppeteer = require("puppeteer");
const request = require('request');

let crawlMode = 1;              // 0: 동행/이오스 모드, 1: 이오스 전용모드
let currRound = -1;
let currTurn = -1;
let currDonghang = -1;
let currPBall = -1;
let currNBalls = "";
let currNBallSum = -1;
let currPBall1 = -1;
let currNBalls1 = "";
let currNBallSum1 = -1;
let browser;
let page;
let callNum = 0;
let callNum2 = 0;
let bSend = false;

// let url = "http://165.76.184.119:3000/race/setCrawlData";
const pang_play_url = "http://43.200.161.132:3000/powerball/setCrawlData";
const pang_pang_url = "http://3.37.180.246:3000/powerball/setCrawlData";
const pang_play_url1 = "http://43.200.161.132:3000/powerball/setCrawlData2";
const pang_pang_url1 = "http://3.37.180.246:3000/powerball/setCrawlData2";


StartCrawl();

async function StartCrawl() {
    console.log(">>>>>>>>>>>>>>>>>>>>> startCrawl - API <<<<<<<<<<<<<<<<<<<<<");
    browser = await puppeteer.launch({
        headless: true,
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ["--mute-audio", "--fast-start", "--disable-extensions", "--disable-setuid-sandbox", "--no-sandbox"],
        ignoreHTTPSErrors: true,
    });

    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    // schedule.scheduleJob("40 4-59/5 * * * *", async function () {
    //     if (crawlMode != 0) return;
    //     var time = Number(moment().format("HHmm"));

    //     if (time > 600) {
    //         bSend = false;
    //         callNum = 0;
    //         currRound = Math.ceil((moment().hours() * 60 + moment().minutes()) / 5);
    //         currTurn = Number(moment().format("YYMMDDHHmm"));
    //         currPBall = -1;
    //         currNBalls = "";
    //         currNBallSum = -1;
    //         if (currRound === 72) return;
    //         RunPowerball();
    //         RunChance();
    //     }
    // });

    // schedule.scheduleJob("5 */5 * * * *", async function () {
    //     if (crawlMode != 0) return;
    //     var time = Number(moment().format("HHmm"));

    //     if (time > 0 && time <= 600) {
    //         bSend = false;
    //         callNum = 0;
    //         currRound = Math.ceil((moment().hours() * 60 + moment().minutes()) / 5);
    //         currTurn = Number(moment().format("YYMMDDHHmm"));
    //         currPBall = -1;
    //         currNBalls = "";
    //         currNBallSum = -1;
    //         if (currRound === 72) return;
    //         RunEOS();
    //     }
    // });

    schedule.scheduleJob("0 */5 * * * *", async function () {
        if (crawlMode != 1) return;

        bSend = false;
        callNum = 0;
        callNum2 = 0;
        currRound = Math.ceil((moment().hours() * 60 + moment().minutes()) / 5);
        if (currRound === 0) currRound = 288;
        currTurn = Number(moment().format("YYMMDDHHmm"));
        currPBall = -1;
        currNBalls = "";
        currNBallSum = -1;
        currPBall1 = -1;
        currNBalls1 = "";
        currNBallSum1 = -1;
        RunEOS();
        await sleep(3000);
        RunPGB();
    });
};

// 베픽 파워볼
async function RunPowerball() {
    if (callNum > 10) {
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getBepickPowerball(timestamp).then(response => {
        if (response != null) {
            let data = response.data.update;
            if (data.round === currRound) {
                currPBall = data.pb;
                currNBalls = data.b1 + "|" + data.b2 + "|" + data.b3 + "|" + data.b4 + "|" + data.b5;
                currNBallSum = data.bsum;
                currDonghang = data.rownum;
                SendData(1);
            } else {
                callNum++;
                RunPowerball__();
            }
        } else {
            callNum++;
            RunPowerball__();
        }
    }).catch(error => {
        console.log("베픽 파워볼 조회 실패 : " + currTurn);
        callNum++;
        if (currPBall === -1) RunPowerball__();
    });
}

// 베픽 eos
async function RunEOS() {
    if (callNum > 10) {
        // SendFailData();
        return;
    }

    var timestamp = new Date().getTime();
    await sleep(1000);
    getBepickEOS(timestamp).then(response => {
        if (response != null) {
            let data = response.data.update;
            console.log("베픽 round: " + data.round + " | 게임 round : " + currRound)
            if (data.round === currRound) {
                currPBall = data.pb;
                currNBalls = data.b1 + "|" + data.b2 + "|" + data.b3 + "|" + data.b4 + "|" + data.b5;
                currNBallSum = data.bsum;
                currDonghang = 0;
                SendData(1);
            } else {
                console.log("베픽 EOS 조회 실패 : " + currTurn);
                callNum++;
                RunEOS__();
            }
        } else {
            console.log("베픽 EOS 조회 실패 : " + currTurn);
            callNum++;
            RunEOS__();
        }
    }).catch(error => {
        console.log("베픽 EOS 조회 실패 : " + currTurn);
        callNum++;
        if (currPBall === -1) RunEOS__();
    });
}

// 엔트리 파워볼
async function RunPowerball__() {
    if (callNum > 10) {
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getEntryPowerball(timestamp).then(response => {
        if (response != null) {
            let data = response.data;
            if (data.date_round === currRound) {
                currPBall = Number(data.ball[5]);
                currNBalls = data.ball[0] + "|" + data.ball[1] + "|" + data.ball[2] + "|" + data.ball[3] + "|" + data.ball[4];
                currNBallSum = data.def_ball_sum;
                currDonghang = data.times;
                SendData(1);
            } else {
                callNum++;
                RunPowerball();
            }
        } else {
            callNum++;
            RunPowerball();
        }
    }).catch(error => {
        console.log("엔트리 파워볼 조회 실패 : " + currTurn);
        callNum++;
        if (currPBall === -1) RunPowerball();
    });
}

// 엔트리 eos
async function RunEOS__() {
    if (callNum > 10) {
        // SendFailData();
        return;
    }
    var timestamp = new Date().getTime();
    await sleep(1000);
    getEntryEOS(timestamp).then(response => {
        if (response != null) {
            let data = response.data;
            console.log("엔트리 round: " + data.date_round + " | 게임 round : " + currRound)
            if (data.date_round === currRound) {
                currPBall = Number(data.ball[5]);
                currNBalls = data.ball[0] + "|" + data.ball[1] + "|" + data.ball[2] + "|" + data.ball[3] + "|" + data.ball[4];
                currNBallSum = data.def_ball_sum;
                currDonghang = 0;
                SendData(1);
            } else {
                console.log("엔트리 EOS 조회 실패 : " + currTurn);
                callNum++;
                RunEOS();
            }
        } else {
            console.log("엔트리 EOS 조회 실패 : " + currTurn);
            callNum++;
            RunEOS();
        }
    }).catch(error => {
        console.log("엔트리 EOS 조회 실패 : " + currTurn);
        callNum++;
        if (currPBall === -1) RunEOS();
    });
}

// 보험 우리볼
async function RunChance() {
    try {
        await page.goto("https://www.wooriball.com/game_powerball.php");                    // 우리볼 5분 파워볼
        const frame = await page.frames().find(frame => frame.name() === "lecture2");
        await sleep(1000);
        if (!frame) {
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

        if (round === currRound) {
            currPBall = pBall;
            currNBalls = ball1 + "|" + ball2 + "|" + ball3 + "|" + ball4 + "|" + ball5;
            currNBallSum = ball1 + ball2 + ball3 + ball4 + ball5;
            currDonghang = roundDong;
            SendData(1);
        }
    } catch (err) {
        console.log("우리볼 파워볼 조회 실패 : " + currTurn);
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
        console.log("베픽 파워볼 axios 실패 : " + currTurn);
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
        console.log("베픽 EOS axios 실패 : " + currTurn);
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
        console.log("엔트리 파워볼 axios 실패 : " + currTurn);
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
        console.log("엔트리 EOS axios 실패 : " + currTurn);
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
        console.log("베픽 LAST 파워볼 axios 실패 : " + currTurn);
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
        console.log("베픽 LAST EOS axios 실패 : " + currTurn);
    }
};

function SendData(type) {
    if (bSend) return;

    try {
        let pang_url = ''
        let pangpang_url = ''
        let ball = ''
        let pBall = ''
        let nBalls = ''
        let nBall = ''

        // type : 1 - EOS, 2 - PGB
        if (type === 1) {
            pang_url = pang_play_url
            pangpang_url = pang_pang_url
            ball = currPBall.toString()
            pBall = currPBall.toString()
            nBalls = currNBalls
            nBall = currNBallSum.toString()
        } else {
            pang_url = pang_play_url1
            pangpang_url = pang_pang_url1
            ball = currPBall1.toString()
            pBall = currPBall1.toString()
            nBalls = currNBalls1
            nBall = currNBallSum1.toString()
        }

        let options1 = {
            uri: pang_url,
            method: 'POST',
            form: {
                turn: currTurn.toString(),
                donghang: currDonghang.toString(),
                round: currRound.toString(),
                ball: ball,
                pBall: pBall,
                nBalls: nBalls,
                nBall: nBall
            }
        }

        let options2 = {
            uri: pangpang_url,
            method: 'POST',
            form: {
                turn: currTurn.toString(),
                donghang: currDonghang.toString(),
                round: currRound.toString(),
                ball: ball,
                pBall: pBall,
                nBalls: nBalls,
                nBall: nBall
            }
        }

        request(options1, function (err, res, body) {
            if (res && res.statusCode === 200) {
                bSend = true;
                console.log(">>>>>>>> [ 팡플레이 " + moment().format("HH:mm:ss.SS") + "] " + currTurn + "턴, " + currRound + " 결과 전송 성공 : [ 파워볼 : " + currPBall + ", 일반볼 : " + currNBalls + ", 일반볼합 : " + currNBallSum + " ]");
            } else {
                console.log(">>>>>>>> 팡플레이 : " + currRound + " 결과 전송 실패 : " + currTurn);
            }
        });

        request(options2, function (err, res, body) {
            if (res && res.statusCode === 200) {
                bSend = true;
                console.log(">>>>>>>> [ 팡팡 " + moment().format("HH:mm:ss.SS") + "] " + currTurn + "턴, " + currRound + " 결과 전송 성공 : [ 파워볼 : " + currPBall + ", 일반볼 : " + currNBalls + ", 일반볼합 : " + currNBallSum + " ]");
            } else {
                console.log(">>>>>>>> 팡팡 : " + currRound + " 결과 전송 실패 : " + currTurn);
            }
        });
    } catch (err) {
        console.log(err);
    }
}

function SendFailData() {
    if (bSend) return;

    try {
        const options = {
            uri: "http://165.76.184.119:3000/race/setCrawlFailData",
            method: 'POST',
            form: {
                turn: currTurn.toString(),
                donghang: currDonghang.toString(),
                round: currRound.toString(),
                ball: currPBall.toString(),
                pBall: currPBall.toString(),
                nBalls: currNBalls,
                nBall: currNBallSum.toString()
            }
        }

        console.log(currRound + " 라운드 조회 실패. 오류 데이터 전송 [ pBall : " + currPBall.toString() + ", nBalls : " + currNBalls + " ]");

        request(options, function (err, res, body) {
            if (res && res.statusCode === 200) {
                bSend = true;
                console.log(">>>>>>>> " + currRound + " 실패 결과 전송 성공");
            } else {
                console.log(">>>>>>>> " + currRound + " 결과 전송 실패 : " + currTurn);
            }
        });
    } catch (err) {
        console.log(err);
    }
}

// pgb
async function RunPGB() {
    if (callNum2 > 10) {
        // race.FailedResult(1);
        console.log(">>>>>>>> PGB 조회 실패 최종");
        return;
    }
    getPGB().then(response => {
        if (response != null) {
            let data = response.data
            if (data.todayRound === currRound) {
                currPBall1 = -1
                currNBalls1 = ""
                currNBallSum1 = -1
                currPBall1 = data.powerball
                let number = data.number;
                currNBalls1 = number.substr(0, 2) + "|" + number.substr(2, 2) + "|" + number.substr(4, 2) + "|" + number.substr(6, 2) + "|" + number.substr(8, 2);
                currNBallSum1 = data.numberSum;
                SendData(2)
                console.log(currRound + " 라운드 PGB 값 넣음 : [ 파워볼 : " + currPBall1 + ", 일반볼 : " + currNBalls1 + ", 일반볼합 : " + currNBallSum1 + "]");
            } else {
                callNum2++;
                if (currPBall1 === -1) RunPGB();
            }
        } else {
            callNum2++;
            if (currPBall1 === -1) RunPGB();
        }
    }).catch(error => {
        console.log("PGB 조회 실패 : " + error)
        callNum2++;
        if (currPBall1 === -1) RunPGB();
    });
}

const getPGB = async () => {
    try {
        return await axios.get("https://www.powerballgame.co.kr/json/powerball.json", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true
        });
    } catch (error) {
        console.log("PGB axios 실패 : " + error);
    }
};

function sleep(sec) {
    return new Promise((resolve) => setTimeout(resolve, sec));
}
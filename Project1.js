// the purpose of this project is to extract info of world cup 2019
// in the form of excel and pdf scorecards
// the real purpose is to learn how to extract info and get experinced with JS
// a very good reason to ever make a project is to have a good fun!!

// node Project1.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=Worldcup.csv --dataDir=WorldCup

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");

// npm help -> command
// use "l_alt + l_shift + F" to orient the json file 

let args = minimist(process.argv);
// console.log(args.source);
// console.log(args.excel);
// console.log(args.dataFolder);

// download using axios
// read using jsdom
// make excel using excel4node
// make pdf using pdf-lib

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function(response){
    let html = response.data;
    // console.log(html);

    let dom = new jsdom.JSDOM(html);  
    let document = dom.window.document;

    let matches = []; // matches array
    let matchInfoDivs = document.querySelectorAll("div.match-score-block");
    for(let i = 0; i < matchInfoDivs.length; i++){
        let match = {}; // match object declared

        let desc = matchInfoDivs[i].querySelector("div.match-info > div.description");
        match.description = desc.textContent;

        let namePs = matchInfoDivs[i].querySelectorAll("p.name");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;


        let scoreSpans = matchInfoDivs[i].querySelectorAll("span.score");
        // match.t1s = "";
        // match.t2s = "";
        if(scoreSpans.length == 2){
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent;
        }
        else if(scoreSpans.length == 1){
            match.t1s = scoreSpans[0].textContent;
            match.t2s = "";
        }
        else{
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchInfoDivs[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;

        matches.push(match);
    }

    // let matchesKaJSON = JSON.stringify(matches);
    // fs.writeFileSync("matches.json", matchesKaJSON, "utf-8"); // makes JSON file with 'matches'

    // console.log(matches);

    let teams = [];
    for(let i = 0; i < matches.length; i++){
        putTeamInTeamsArrayIfMissing(teams, matches[i]);
        putMatchInAppropriateTeam(teams, matches[i]);
    }

    // console.log(teams);

    // let teamsKaJSON = JSON.stringify(teams); 
    // fs.writeFileSync("teams.json", teamsKaJSON, "utf-8"); // makes JSON file with 'teams'

    prepareExcel(teams, args.excel);
    prepareFolderAndPdfs(teams, args.dataDir);
});

function prepareFolderAndPdfs(teams, dataDir){
    if(fs.existsSync(dataDir) == false){
        fs.mkdirSync(dataDir);
    }

    for(let i = 0; i < teams.length; i++){
        let teamFolderName = path.join(dataDir, teams[i].name);
        fs.mkdirSync(teamFolderName);
        
        for(let j = 0; j < teams[i].matches.length; j++){
            let match = teams[i].matches[j];
            createMatchScorecardPdf(teamFolderName, teams[i].name, match);
        }
    }
}

function createMatchScorecardPdf(teamFolderName, homeTeam, match){
    let t1 = homeTeam;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let res = match.result;

    let matchFileName = path.join(teamFolderName, match.vs + ".pdf");
    let templateBytes = fs.readFileSync("Template.pdf");

    let pdfDocKaPromise = pdf.PDFDocument.load(templateBytes);
    pdfDocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 670,
            size: 12
        });
        page.drawText(t2, {
            x: 320,
            y: 645,
            size: 12
        });
        page.drawText(t1s, {
            x: 320,
            y: 620,
            size: 12
        });
        page.drawText(t2s, {
            x: 320,
            y: 595,
            size: 12
        });
        page.drawText(res, {
            x: 320,
            y: 570,
            size: 12
        });

        let changedBytesKaPromise = pdfdoc.save();
        changedBytesKaPromise.then(function (changedBytes) {
            fs.writeFileSync(matchFileName, changedBytes);
        })
    })
}

function prepareExcel(teams, excelFileName){
    let wb = new excel4node.Workbook();

    for(let i = 0; i < teams.length; i++){
        let tsheet = wb.addWorksheet(teams[i].name);

        tsheet.cell(1, 1).string("Vs");
        tsheet.cell(1, 2).string("Self Score");
        tsheet.cell(1, 3).string("Opponent Score");
        tsheet.cell(1, 4).string("Result");

        for(let j = 0; j < teams[i].matches.length; j++){
            tsheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            tsheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            tsheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            tsheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }

    wb.write(excelFileName);
}

function putTeamInTeamsArrayIfMissing(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });
    }

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}

function putMatchInAppropriateTeam(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });
}
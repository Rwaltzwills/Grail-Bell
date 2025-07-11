/*
 * Grail Bell
- Line by line
-- Can click on a line to edit it
-- When typing not in a line, produce new line
-- Split up into timestamp - speaker - line - controls
-- Can mark line as error
-- Can mark line as no error
-- Speaker name replacement
-- Keeps diff
-- Keeps list of running words that have been changed, alerts?
-- Download new SRT
- Video
-- Can skip to time by clicking on a line
-- Skip to only errors
-- Backtrack / Skip 5s at a time with keyboard command
-- Can edit keyboard commands
 */

document.addEventListener("DOMContentLoaded", afterLoad);

function afterLoad() {
    //Display JS enabled elements within page, hide warning
    document.getElementById('JS').style = "";
    document.getElementById('noJS').style.display = "none";
    transcript.init();
}

transcript = {
    current: [],
    
    Transcript_line: class {
        constructor(index, timestamp, line){
            self.index = index;
            self.line = line;

            self.timestamp = timestamp;
            self.startTime = this.convertTime(timestamp.substr(0,12));
            self.endTime = this.convertTime(timestamp.substr(17));
        }

        convertTime(time){
            /*Converts SRT text time into an int of seconds*/
            var z = 0;
            z = z + parseInt(time.substr(0,1))*60^2; //Add hours
            z = z + parseInt(time.substr(3,4))*60; //Add minutes
            z = z + parseInt(time.substr(6,7)); //Add seconds
            z = z + parseInt(time.substr(9))*.001 //Add milliseconds
            return z;
        }
    },

    init: function () {
        
    },

    load: function (e, files) {
        reader = new FileReader();
        reader.addEventListener('load',
            () => {
                this.importSRT(reader.result);
            })
        reader.readAsText(files[0]);
    },

    save: function () {

    },

    importSRT: function (SRT) {
        const lines = SRT.split('\n');
        //Write SRT ingestion here
        //0 is index
        //1 is timestamp text
        //Everything else is line until a blank line
        //Remove all lines up to this point from SRT, start loop once more
        while(lines.length){
            var i = lines[0];
            if(isNaN(parseInt(i))){
                console.log("Non-integer reached, eof assumed");
                break;
                //Can probably make this a little bit more robust
            }
            var t = lines[1];
            var s = "";
            var index = 2;

            for(index = 2; lines[index] != "\r"; index++){
                s += lines[index];
            };

            this.current.push(new this.Transcript_line(i,t,s));
            lines.splice(0,index+1);
        }
    }
};

video = {};

options = {};

network = {};




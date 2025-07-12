/*
 * Grail Bell TO-DO (some TO-DOs scattered througout as well, ctrl+f)
- Minimum
-- Transcript
--- Speaker functionalities
---- Speaker find and replace
---- Identify speaker from imported SRT
---  Handle when scrolling needs to be paused
---- Scroll bar has been manually moved, or focus is in textbox
--- Insert new lines
-- Video
--- Can skip to time by clicking on a line
--- Backtrack / Skip 5s at a time with keyboard command
***
- Nice to Have
-- Transcript
--- Can mark line as error
--- Can mark line as no error
--- Can move indexes up and down
--- Keeps diff
--- Keeps list of running words that have been changed, alerts?
- Video
-- Skip to only errors
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
    current: [],              //current transcript
    old_lines: [],
    new_lines: [],
    scrolling: true,          //Is the containing div currently scrolling
    manually_scrolled: false, //Did the user manually scroll the div up
    transcript_div: null,     //Reference to the transcript div, will be set on load()


    CONTROLGRID: 'controlGrid',
    SYNCHIGHLIGHT: 'syncHighlight',
    
    Transcript_line: class {
        constructor(index, timestamp, line){
            this.index = parseInt(index);
            this.line = line;
            this.speaker = ""; //TO-DO: Enable speaker tags later

            this.changeTimestamp(timestamp);
        }

        changeTimestamp(timestamp){
            //Configured for SRT
            this.timestamp = timestamp;
            this.startTime = this._convertTime(timestamp.substr(0,12));
            this.endTime = this._convertTime(timestamp.substr(17));
        }

        _convertTime(time){
            /*Converts SRT text time into an int of seconds*/
            //TO-DO: Bug here with calculations
            var z = 0;
            z = z + parseInt(time.slice(0,1))*60^2; //Add hours
            z = z + parseInt(time.slice(3,4))*60;   //Add minutes
            z = z + parseInt(time.slice(6,7));      //Add seconds
            z = z + parseInt(time.slice(9))*.001    //Add milliseconds
            if(isNaN(z)){
                throw new transcript.ImportError();
            }
            return z;
        }

        produceSRTPassage(){
            let s = "";
            s += this.index.trimEnd() + "\r";
            s += this.timestamp.trimEnd() + "\r";
            s += this.speaker + this.line.trimEnd() + "\r"; 
            s += "\r";
            //Since the speaker line isn't in the SRT standard, 
            //shouldn't have any \r on the end.

            return s;
        }
    },
    
    ImportError: class extends Error{
        constructor(message= "", ...args){
            super(message, ...args);
            this.message = message + "Error occured while importing transcript file."
        }
    },

    timestamp_clicked: new Event('timestamp clicked'),

    init: function () {
        
    },

    load: function (e, files) {
        this.transcript_div = document.getElementById("Transcript-div");

        function getControls(){
            //TO-DO: Make this more robust
            var controls = document.createElement('div');
            controls.style = this.CONTROLGRID;
            var errorControls = document.createElement('div');
            errorControls.innerHTML = "<a href='javascript:alert(\"okay\")'>ok</a> <a href='javascript:alert(\"no\")'>no</a>";
            controls.append(errorControls);
            var movingControls = document.createElement('div');
            movingControls.innerHTML = "<a href='javascript:alert(\"up\")'>up</a> <a href='javascript:alert(\"down\")'>down</a>";
            controls.append(movingControls);
            return controls;
        }

        reader = new FileReader();
        reader.addEventListener('load',
            () => {
                this.importSRT(reader.result);

                //TO-DO: Add event hook for video time updates

                table = document.getElementById('Transcript-table');
                for (let ind = 0; ind < this.current.length; ind++){
                    let r = document.createElement('tr');
                    let c = document.createElement('td'); //Controls
                    let i = document.createElement('td'); //Index
                    let t = document.createElement('td'); //Time
                    let s = document.createElement('td'); //Speaker
                    let l = document.createElement('td'); //Line

                    r.dataset.index     = this.current[ind].index;

                    t.dataset.startTime = this.current[ind].startTime;
                    t.dataset.endTime   = this.current[ind].endTime;

                    t.onclick = (e) => {dispatchEvent(this.timestamp_clicked);};
                    //TO-DO: Add controls to each line and their associated actions

                    
                    let t_input = document.createElement("input");
                    t_input.setAttribute('type','text');
                    t_input.setAttribute('disabled', '');
                    t_input.value = this.current[ind].timestamp;
                    t_input.onchange = (e) => {this.current[ind].changeTimestamp(t_input.value);};

                    
                    let s_input = document.createElement("input");
                    s_input.setAttribute('type','text');
                    s_input.value = this.current[ind].speaker;
                    s_input.onchange = (e) => {this.current[ind].speaker = s_input.value;};

                    let l_input = document.createElement("input");
                    l_input.setAttribute('type','text');
                    l_input.value = this.current[ind].line;
                    l_input.onchange = (e) => {this.current[ind].line = l_input.value;};


                    c.appendChild(getControls());
                    i.appendChild(document.createTextNode(this.current[ind].index));
                    t.appendChild(t_input);
                    s.appendChild(s_input);
                    l.appendChild(l_input);

                    r.appendChild(c);
                    r.appendChild(i);
                    r.appendChild(t);
                    r.appendChild(s);
                    r.appendChild(l);

                    table.appendChild(r);
                }
            })

        reader.readAsText(files[0]);
    },

    save: function () {
        let res = "";
        this.current.forEach(line => {
            res += line.produceSRTPassage();
        });

        let dl = document.createElement('a');
        dl.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(res))
        dl.setAttribute('download', "result.srt")
        dl.click()
    },

    importSRT: function (SRT) {
        const lines = SRT.split('\n');
        while(lines.length){
            var i = lines[0];
            if(isNaN(parseInt(i))){
                debugLog("Non-integer reached, eof assumed");
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
            this.new_lines.push(this.current.at(-1));
            lines.splice(0,index+1);
        }
    },

    scrollTo: function (tr){
        tr.scrollIntoView({ behavior: "smooth"}); 
        //TO-DO: Custom logic to scroll into center of table, not top.
    },

    highlightRow: function (tr){
        tr.toggle(this.SYNCHIGHLIGHT);
    },

    //TO-DO: Make sure we sort current[] on load()
    handleVideoUpdate: function (time){
        for(let i = 0; i < this.new_lines.length;){
            if(time < parseInt(this.new_lines[i].startTime)) break;

            tr = document.querySelector('tr[data-index="'.concat(this.new_lines[i].index,'"]'));

            if(time < parseInt(this.new_lines[i].endTime)){
                tr.classList.add(this.SYNCHIGHLIGHT);
                if(this.scrolling){
                    this.scrollTo(tr);
                }
                i++;
            }
            else{
                tr.classList.remove(this.SYNCHIGHLIGHT);
                this.old_lines.push(this.new_lines[i]);
                this.new_lines.splice(i,1);
            }
            
        }
    },

    handleScrolling: function (){
        return true;
        //TO-DO: Handle manual scrolling
    }
};

video = {};

options = {};

network = {};

//Debug section
var debug_mode = true;

function debugLog(msg){
    if (debug_mode) console.log(msg);
}


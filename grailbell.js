/*
 * Grail Bell TO-DO (some TO-DOs scattered througout as well, ctrl+f)
- Minimum
-- Transcript
--- Speaker functionalities
---- Speaker find and replace
***
- Nice to Have
-- Transcript
--- Can move indexes up and down
--- Keeps diff
--- Keeps list of running words that have been changed, alerts?
- Video
-- Youtube
-- Twitch
 */

document.addEventListener("DOMContentLoaded", afterLoad);

function afterLoad() {
    //Display JS enabled elements within page, hide warning
    document.getElementById('JS').style = "";
    document.getElementById('noJS').remove()
    transcript.init();
    video.init();
    options.init();
}

const transcript = {
    current: [],              //current transcript
    old_lines: [],
    new_lines: [],
    scrolling: true,          //Is the containing div currently scrolling
    manually_scrolled: false, //Did the user manually scroll the div up
    transcript_div: null,     //Reference to the transcript div, will be set on init()
    ignoreScrollEvent: false,
    lastScrolledPosition: null,
    autoScrollTarget: null,
    speakerDemarcation: null, //Speaker demarcating character used at import


    CONTROLGRID: 'controlGrid',
    SYNCHIGHLIGHT: 'syncHighlight',
    ERRORCLASS: 'errorLine',
    
    Transcript_line: class {
        constructor(index, timestamp, line, speaker){
            this.index = parseInt(index);
            this.line =  String(line).trim();
            this.speaker = String(speaker).trim() ? speaker : ""; 

            this.changeTimestamp(String(timestamp));
        }

        changeTimestamp(timestamp){
            //Configured for SRT
            this.timestamp = timestamp;
            this.startTime = this._convertTime(timestamp.substr(0,12));
            this.endTime = this._convertTime(timestamp.substr(17));
        }

        _convertTime(time){
            /*Converts SRT text time into an int of seconds*/
            let z = 0;
            z = z + parseInt(time.slice(0,2))*60*60; //Add hours
            z = z + parseInt(time.slice(3,5))*60;   //Add minutes
            z = z + parseInt(time.slice(6,8));      //Add seconds
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

    init: function () {
        this.transcript_div = document.getElementById("Transcript-div");
        this.transcript_div.addEventListener("scroll", (e) =>{
            this.handleScrolling(e);
        });
        debugLog('init');
    },

    load: function (e, files) {
        reader = new FileReader();
        reader.addEventListener('load',
            () => {
                this.speakerDemarcation = document.getElementById("speaker_demarcation").value;

                this.importSRT(reader.result);

                

                table = document.getElementById('Transcript-table');
                for (let ind = 0; ind < this.current.length; ind++){
                    let r = this.lineToTR(this.current[ind]);
                    table.appendChild(r);
                }

                window.addEventListener("video time update", (e) => {
                    debugLog("Video time updated to ".concat(e.detail.time));
                    this.handleVideoUpdate(e.detail.time);
                })
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
            let sp = null;
            var index = 2;

            for(index = 2; lines[index].trim() != ""; index++){
                s += lines[index];
            };

            if(this.speakerDemarcation && s.indexOf(this.speakerDemarcation) > -1){
                sp = s.split(this.speakerDemarcation);
                s = sp.slice(1,sp.length);
                sp = sp[0];
            }

            this.current.push(new this.Transcript_line(i,t,s,sp));
            this.new_lines.push(this.current.at(-1));
            lines.splice(0,index+1);
        }
    },

    scrollTo: function (tr){
        tr.scrollIntoView({block: "center", behavior: "smooth"}); 
        this.autoScrollTarget = tr;
        this.lastScrolledPosition = tr.getBoundingClientRect().y;
        debugLog("TR Goal ".concat(tr.scrollTop + tr.clientHeight));
    },

    highlightRow: function (tr){
        tr.toggle(this.SYNCHIGHLIGHT);
    },

    //TO-DO: Make sure we sort current[] on load()
    handleVideoUpdate: function (time){
        //TO-DO: There's a bug where it's deloading all the lines?
        for(let i = 0; i < this.new_lines.length;){
            if(time < parseInt(this.new_lines[i].startTime)) break;

            tr = document.querySelector('tr[data-index="'.concat(this.new_lines[i].index,'"]'));

            if(time < parseInt(this.new_lines[i].endTime)){
                tr.classList.add(this.SYNCHIGHLIGHT);
                if(this.scrolling){
                    debugLog("Sending tr index ".concat(tr.dataset.index, " to scroll."))
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

    handleScrolling: function (e){
        if(this.autoScrollTarget){
            let tr_y = this.autoScrollTarget.getBoundingClientRect().y;
            let div_y = this.transcript_div.getBoundingClientRect().y;

            let prev_dist = Math.abs(div_y - Math.abs(this.lastScrolledPosition));
            let curr_dist = Math.abs(div_y - Math.abs(tr_y));

            debugLog("Prev dist: ".concat(prev_dist, " Curr dist: ", curr_dist));


            if(prev_dist < curr_dist){
                this.scrolling = false;
                this.autoScrollTarget = null;
            }
            this.lastScrolledPosition = tr_y;
        }
        //If there's a automatic scrolling tr set
        //then determine if the scroll is moving towards or away from transcript-div y value
        //if abs distance increases, interpret it as pausing autoscroll
        //For resuming, just put a sync button somewhere
    },

    addNewLine: function(tr_before){
        let before_index = parseInt(tr_before.dataset.index);
        let new_line = new this.Transcript_line(before_index+1,"",""); 
        //TO-DO: Figure default timestamp? Probably something convenient we can put here
        let new_tr = this.lineToTR(new_line);
        tr_before.insertAdjacenetElement('afterEnd',new_tr);
        this.current.splice(before_index,0,new_line);
        this.current.slice(before_index+1).forEach(line => {
            line_tr = document.querySelector('tr[data-index="'.concat(line.index,'"]'));
            line.index++;
            line_tr.dataset.index = line.index;
            line_tr.children[1].innerHTML = line.index; 
            //Child of index 1 is going to be the index td
        });
    },

    removeLine: function(tr){
        let del_index = parseInt(tr.dataset.index) - 1;
        tr.remove();

        this.current.splice(del_index,1);
        this.current.slice(del_index).forEach(line => {
            line_tr = document.querySelector('tr[data-index="'.concat(line.index,'"]'));
            line.index--;
            line_tr.dataset.index = line.index;
            line_tr.children[1].innerHTML = line.index; 
            //Child of index 1 is going to be the index td
        });

        //TO-DO: Handle new and old line arrays
    },

    lineToTR: function(line){
        let r = document.createElement('tr');
        let c = document.createElement('td'); //Controls
        let i = document.createElement('td'); //Index
        let t = document.createElement('td'); //Time
        let s = document.createElement('td'); //Speaker
        let l = document.createElement('td'); //Line

        r.dataset.index     = line.index;

        t.dataset.startTime = line.startTime;
        t.dataset.endTime   = line.endTime;

        t.onclick = (e) => {
            dispatchEvent(new CustomEvent('timestamp click', 
                        {detail: {time:e.target.dataset.startTime}}));
                        this.old_lines = [];
                        this.new_lines = this.current.slice(0,this.current.length+1);
                        document.querySelectorAll('.'.concat(this.SYNCHIGHLIGHT)).forEach( (tr) => {
                            tr.classList.remove(this.SYNCHIGHLIGHT);
                        });
        };
        //TO-DO: Add controls to each line and their associated actions

        /*Code for timestamp input

        let t_input = document.createElement("input");
        t_input.setAttribute('type','text');
        t_input.setAttribute('disabled', '');
        t_input.value = line.timestamp;
        t_input.onchange = (e) => {line.changeTimestamp(t_input.value);};
        */

        
        let s_input = document.createElement("textarea");
        s_input.setAttribute('type','text');
        s_input.value = line.speaker;
        s_input.onchange = (e) => {line.speaker = s_input.value;};
        s_input.onfocus = (e) => {this.scrolling = false;};

        let l_input = document.createElement("textarea");
        l_input.setAttribute('type','text');
        l_input.value = line.line;
        l_input.onchange = (e) => {line.line = l_input.value;};
        l_input.onfocus = (e) => {this.scrolling = false;};


        c.appendChild(this.getControls());
        i.appendChild(document.createTextNode(line.index));
        t.appendChild(document.createTextNode(line.timestamp));
        s.appendChild(s_input);
        l.appendChild(l_input);

        r.appendChild(c);
        r.appendChild(i);
        r.appendChild(t);
        r.appendChild(s);
        r.appendChild(l);

        return r;
    },

    getControls: function(){
        //TO-DO: Make this more robust
        var controls = document.createElement('div');
        controls.style = this.CONTROLGRID;
        var errorControls = document.createElement('div');
        errorControls.innerHTML = "<a href='javascript:alert(\"okay\")'>ok</a> <a onclick='transcript.markError(this.parentNode.parentNode.parentNode.parentNode)'>no</a>";
        controls.append(errorControls);
        var movingControls = document.createElement('div');
        movingControls.innerHTML = "<a href='javascript:alert(\"up\")'>up</a> <a href='javascript:alert(\"down\")'>down</a>";
        controls.append(movingControls);
        return controls;
    },

    resetScroll: function(){
        this.scrolling = true;
    },

    markError: function(tr){
        tr.classList.toggle(this.ERRORCLASS);
    },

    scrollToFirstError: function(){
        let tr = document.querySelector('.'.concat(this.ERRORCLASS));
        let time_td = tr.children[2];
        time_td.click();
    },
};

const video = {
    video_elem: null, //Set during init()
    video_div:  null, //Set during init()

    init: function(){
        this.video_elem = document.getElementById("Video");
        this.video_div = document.getElementById("Video-area");
        if(this.video_elem && this.video_div) return 1;
        else return -1;
    },

    uploadFileBox: function (){
        var fake_input = document.createElement('input');
        fake_input.type = "file";
        fake_input.accept="video/*";
        fake_input.onchange = () => {this.load(fake_input.files[0])};
        
        this.video_elem.onclick = null;

        fake_input.click();
    },

    load: function (file){
  
        //Set selected video as src
        this.video_elem.src = URL.createObjectURL(file);

        //Go straight to first frame and pause
        //Then unload onplay to make sure you can actually progress in the video.
        this.video_elem.load();
        this.video_elem.onplay = () => {
            this.video_elem.pause();
            this.video_elem.onplay = "";

            this.video_elem.addEventListener("timeupdate", () =>{
                dispatchEvent(new CustomEvent('video time update', {detail: {time:this.video_elem.currentTime}}));
            });

            window.addEventListener('timestamp click', (e) => {
                debugLog("Timestamp jumped to ".concat(e.detail.time));
                this.setTime(e.detail.time);
            });

            window.addEventListener('jumpback press', (e) => {
                e.stopPropagation();
                this.rewindFive()
            });

            window.addEventListener('jumpforward press', (e) => {
                e.stopPropagation();
                this.skipFive();
            });

            window.addEventListener('pause press', (e) => {
                e.stopPropagation();
                if(this.video_elem.paused){
                    this.video_elem.play();
                }
                else {
                    debugLog('aused')

                    this.video_elem.pause();
                }
            });
        }
            

    },

    pause: function (){
        this.video_elem.pause();

        return this.video_elem.paused == 1;
    },

    play: function (){
        this.video_elem.play();

        return this.video_elem.paused == 0;
    },

    skipFive: function (){
        this.setTime(this.video_elem.currentTime+5);
        return this.video_elem.currentTime;
    },

    rewindFive: function(){
        this.setTime(this.video_elem.currentTime-5);
        return this.video_elem.currentTime;
    },

    setTime: function(time){
        this.video_elem.currentTime = time;
        return this.video_elem.currentTime;
    },

    increaseSpeed: function(){
        this.setSpeed(this.video_elem.playbackRate + .1);
        return this.video_elem.playbackRate;
    },

    decreaseSpeed: function(){
        this.setSpeed(this.video_elem.playbackRate - .1);
        return this.video_elem.playbackRate;
    },

    setSpeed: function(speed){
        this.video_elem.playbackRate = speed;
        return this.video_elem.playbackRate;
    }
};

const options = {
    sidebar_elem: null, //set by init
    button_elem: null, //set by init
    key_controls: {},

    jumpback_event: new Event("jumpback press"),
    jumpforward_event: new Event("jumpforward press"),
    pause_event: new Event("pause press"),

    CONTROL_PREFIX: "Shift + ",
    REBINDABLE_BUTTON: "REBINDABLE",

    init: function(){
        this.button_elem = document.getElementById("Options-button");
        this.sidebar_elem = document.getElementById("Options-area");

        window.addEventListener('keydown', (e) => {this.handleKeyInput(e)});

        this.loadDefaultKeyControls();

        for(var [k,v] of Object.entries(this.key_controls)) {
            let control_div = document.getElementById("Options-controls");
            let new_div = document.createElement('div');
            new_div.classList.add(this.REBINDABLE_BUTTON);
            new_div.append(document.createTextNode(String(v.type).concat(": ",this.CONTROL_PREFIX,k)));
            new_div.onclick = (e) => {this.controlRebindClick(e);};
            this.sidebar_elem.append(new_div);
        }

        if(this.sidebar_elem && this.button_elem) return 1;
        return -1;
    },

    controlRebindClick: function (e){
        let target = e.target;
        let key = target.innerHTML.split(this.CONTROL_PREFIX)[1];
        debugLog("Rebinding ");
        window.addEventListener('keydown', (event) => {
            event.stopPropagation();
            this.rebindControl(key, event.key);
            target.innerHTML = String(this.key_controls[event.key].type).concat(": ",this.CONTROL_PREFIX,event.key);

        }, {once: true});
    },

    rebindControl: function (key, new_key){
        let target_event = this.key_controls[key];
        this.key_controls[new_key] = target_event;
        delete this.key_controls[key];

        return this.key_controls;
    },

    loadDefaultKeyControls: function (){
        //TO-DO: Load from cookie

        this.key_controls[" "] = this.pause_event;
        this.key_controls["ArrowLeft"] = this.jumpback_event;
        this.key_controls["ArrowRight"] = this.jumpforward_event;

        return this.key_controls;
    },

    handleKeyInput: function (e) {
        console.log(e)
        if(!e.shiftKey) return 0;
        if(!(e.key in this.key_controls)) return 0;

        dispatchEvent(this.key_controls[e.key]);
        return 1;
    },

    slideBar: function (){
        this.sidebar_elem.classList.toggle("options-out");
        this.sidebar_elem.classList.toggle("options-in");
    },
};

network = {};

//Debug section
var debug_mode = true;

/*if(debug_mode){
    test.video();
}*/

function debugLog(msg){
    if (debug_mode) console.log(msg);
}

test = {
    video: function(){
        if(!video.video_elem.src) return "Please load a video first.";

        this.test(video.init.bind(video), [], 1);

        this.test(video.play.bind(video), [], 1);
        this.test(video.pause.bind(video), [], 1);
        this.test(video.setTime.bind(video), [video.video_elem.duration/2], video.video_elem.duration/2);
        this.test(video.setSpeed.bind(video), [.5], .5);
  
    },

    options: function(){

        this.test(options.handleKeyInput.bind(options), [{key: "ArrowLeft", shiftKey: true}], 1);
        this.test(options.handleKeyInput.bind(options), [{key: "ArrowLeft", shiftKey: false}], 0);
        this.test(options.handleKeyInput.bind(options), [{key: "a", shiftKey: true}], 0);
        this.test(options.handleKeyInput.bind(options), [{key: "a", shiftKey: false}], 0);
        
        //Rebind test
        debugLog("Rebind test");

        let expectation = {};
        expectation["a"] = this.pause_event;
        expectation["ArrowLeft"] = this.jumpback_event;
        expectation["ArrowRight"] = this.jumpforward_event;

        let target =  document.getElementsByClassName(options.REBINDABLE_BUTTON)[0];
        debugLog("Target.");
        debugLog(target);
        debugLog("Clicking target");
        target.click();
        debugLog("Pressing a");
        window.dispatchEvent(new KeyboardEvent('keydown', {key: "A"}));
        if(options.key_controls["A"] == options.pause_event){
            debugLog("Rebind test passed");
        }
        else{
            debugLog("Rebind test failed");
            debugLog(options.key_controls);
        };
        window.dispatchEvent(new KeyboardEvent('keydown', {key: "A", shiftKey: true}));
        

    },

    test: function(func, args, expected){
        let ret = func(...args);
        if(ret != expected){
            debugLog(func.name.concat(" test bad. Return value: ",ret, " Expected: ", expected));
        }
        else{
            debugLog(func.name.concat(" test sat."));
        }
    }
};
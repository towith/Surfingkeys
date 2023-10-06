module.exports = {
    showAdvanced: true,
    snippets: `
api.mapkey('oo', 'open new tab', function () {
    api.RUNTIME("openLink", {
            tab: {
                    tabbed: true,
                    active: true
                },
            url: "chrome-extension://aajlcoiaogpknhgninhopncaldipjdnp/pages/start.html"
        });
});
settings.stealFocusOnLoad=true;
settings.focusAfterClosed = 'last';
settings.focusOnSaved=true;
settings.omnibarSuggestion=true;
settings.showModeStatus=false;
settings.focusFirstCandidate=false;
settings.defaultSearchEngine='w';
settings.tabsMRUOrder=true;
settings.historyMUOrder=true;
settings.newTabPosition='last';
settings.interceptedErrors=['*'];
settings.language='zh-CN';
settings.enableAutoFocus=true;
settings.caseSensitive=false;
settings.smartCase=true;
settings.cursorAtEndOfInput=true;
settings.digitForRepeat=true;

// stock sites
const helperUrl = 'http://localhost:9303/#';

// xuangubao
function ajaxLink(link) {
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open('GET', link, true);
    xmlHttpRequest.onreadystatechange = function () {
        console.log(this.readyState);
        console.log(this.responseText);
    };
    xmlHttpRequest.send();
}


function helperLink(link) {
    let url = helperUrl + link;
    console.log('open', url);
    window.open(url, '_blank');
}


api.mapkey('T', 'Choose a tab with omnibar', function() {
    api.Front.openOmnibar({type: "Tabs"});
});

api.mapkey('g1', 'event 1', function() {
    let event = new CustomEvent('SkEvt1', { detail: window['SkEvt1Arg'] });
    window.dispatchEvent(event);
    console.log('fire SkEvt1');
});
api.mapkey('g2', 'event 2', function() {
    let event = new CustomEvent('SkEvt2', { detail: window['SkEvt2Arg'] });
    window.dispatchEvent(event);
    console.log('fire SkEvt2');
});
api.mapkey('g3', 'event 3', function() {
    let event = new CustomEvent('SkEvt3', { detail: window['SkEvt3Arg'] });
    window.dispatchEvent(event);
    console.log('fire SkEvt3');
});
api.mapkey('g4', 'event 4', function() {
    let event = new CustomEvent('SkEvt4', { detail: window['SkEvt4Arg'] });
    window.dispatchEvent(event);
    console.log('fire SkEvt4');
});
api.mapkey('g5', 'event 5', function() {
    let event = new CustomEvent('SkEvt5', { detail: window['SkEvt5Arg'] });
    window.dispatchEvent(event);
    console.log('fire SkEvt5');
});

api.mapkey('g=', 'open session home', function() {
    api.RUNTIME('openSession', {
        name: 'home'
    });
    setTimeout(() => {
        api.Normal.feedkeys('99R');
    }, 500);
});

api.mapkey('gww', 'open session work', function() {
    api.RUNTIME('openSession', {
        name: 'work'
    });
    setTimeout(() => { api.Normal.feedkeys('99R') }, 500);
});


api.mapkey('gwf', 'open session fupan', function () {
    api.RUNTIME('openSession', {
        name: 'fupan'
    });
    setTimeout(() => { api.Normal.feedkeys('1R') }, 500);
});

api.mapkey('at', 'Open Tdx link', () => {
    api.Hints.create('ul.stock-group', (e) => {
        let code = e.querySelector('a').href.match(/\d{6}/)[0];
        let link = \`http://localhost:11031/tdx?action=stock&code=\${code}\`;
        ajaxLink(link);
    });
}, { domain: /xuangubao\.cn/ });

api.mapkey('ad', 'Add concern', () => {
    api.Hints.create('ul.stock-group', (e) => {
        let code = e.querySelector('a').href.match(/\d{6}/)[0];
        let name = e.querySelector('span.name').innerText;
        let source = '选股宝快讯';
        let content = encodeURIComponent(e.parentElement.previousElementSibling.previousElementSibling.innerText);
        let link = \`/addConcern/new?code=\${code}&name=\${name}&content=\${content}&type=TXT&source=\${source}\`;
        // api.RUNTIME("openLink", {tab: {tabbed: true, active: true}, url: link});
        helperLink(link);
    });
}, { domain: /xuangubao\.cn/ });

// xilimao

api.mapkey('at', 'Open Tdx link', () => {
    api.Hints.create('tr  div.text-truncate .zt1', (e) => {
        let tr = e.closest('tr');
        let code = tr.querySelector('td:nth-child(2)').innerText;
        let link = \`http://localhost:11031/tdx?action=stock&code=\${code}\`;
        ajaxLink(link);
    });
}, { domain: /xilimao\.com/ });

api.mapkey('ad', 'Add concern', () => {
    api.Hints.create('tr  div.text-truncate .zt1', (e) => {
        let tr = e.closest('tr');
        let code = tr.querySelector('td:nth-child(2)').innerText;
        let name = tr.querySelector('td:nth-child(3)').innerText;
        let source = '犀利猫';
        let zt2 = tr.querySelector('.zt2');
        let tContent = zt2.innerText;
        let content = encodeURIComponent(tContent);
        let link = \`/addConcern/new?code=\${code}&name=\${name}&content=\${content}&type=TXT&source=\${source}\`;
        helperLink(link);
    });
}, { domain: /xilimao\.com/ });


// api.Hints.style('border: solid 3px #552a48; color:#efe1eb; background: initial; background-color: #552a48;');



api.addSearchAlias('w', 'bing', 'http://bing.com/search?setmkt=en-us&setlang=en-us&q=', 's', 'http://api.bing.com/osjson.aspx?query=', function (response) {
    var res = JSON.parse(response.text);
    return res[1];
});
api.mapkey('gR', '#1Open reddit link', function () {
    api.Hints.create('a[href]:not([class*="give-gold"]):not([class*="reportbtn"])', api.Hints.dispatchMouseClick)
}, { domain: /reddit\.com/ });

/*
api.addSearchAlias('g', 'google', 'https://www.bing.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function (response) {
    var res = JSON.parse(response.text);
    return res[1];
});

api.addSearchAlias('gg', 'google2', 'https://www.google.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function (response) {
    var res = JSON.parse(response.text);
    return res[1];
});
*/

// an example to create a new mapping \`ctrl-y\`
api.mapkey('<ctrl-y>', 'Show me the money', function () {
    Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
});

// an example to replace \`T\` with \`gt\`, click \`Default mappings\` to see how \`T\` works.
api.map('gt', 'T');

api.map('-','T');

// an example to remove api.mapkey \`Ctrl-i\`
api.unmap('<ctrl-i>');

api.map('F','gf');


api.map('<Alt-l>', ';U');
// aceVimMap('jk', '<Esc>', 'insert');


settings.theme = \`
#sk_omnibar {
    border-radius: 0!important;
    box-shadow: -1px -1px 7px 2px lightgrey;
    border: 1px solid lightgray;
    width:unset;
    top:0;
}
.sk_theme .separator{
    display:none
}
#sk_tabs{
    background: unset;
}
div.sk_tab_wrap{
    border-top: unset;
    padding-top: unset;
}
div.sk_tab{
    display: flex;
    /*background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#DAE6F5), color-stop(100%,lightblue));*/
    /*background: lightblue;*/
    width: 20em!important;
    margin: auto;
}
\`

settings.theme = \`
\${settings.theme}
.sk_theme {
  font-family: SauceCodePro Nerd Font, Consolas, Menlo, monospace;
  font-size: 10pt;
  background: #f0edec;
  color: #2c363c;
}
.sk_theme tbody {
  color: #f0edec;
}
.sk_theme input {
  color: #2c363c;
}
.sk_theme .url {
  color: #1d5573;
}
.sk_theme .annotation {
  color: #2c363c;
}
.sk_theme .omnibar_highlight {
  color: #88507d;
}
.sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) {
  background: #f0edec;
}
.sk_theme #sk_omnibarSearchResult ul li.focused {
  background: #cbd9e3;
}
#sk_status,
#sk_find {
  font-size: 10pt;
}
\`;

`
};

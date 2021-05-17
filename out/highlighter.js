const OUTPUT = document.getElementById("output");
String.prototype.a = function () {
  return this.split("").reverse().join("");
};
String.prototype.b = function () {
  return this.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};
const [
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P 
] = [
  "STR",
  "KEY",
  "TXT",
  "OPR",
  "NL",
  "CMT",
  "NUM",
  "WS",
  "FN",
  "AR",
  "CPT",
  "OBP",
  "MT",
  "RE",
  "PA",
  "NT"
];

// RegEx
var KeywordRE =
  /^(arguments|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|eval|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|native|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)$/;
var operatorRE = /(\=|\+|\-|\*|\/|%|!|<|>|&|\|)*/;
var nameCharRE = /[a-zA-Z0-9_\$]/;
var number = /^((\d*)|(0x[0-9a-f]*)|(0b[01]*))$/;
var nullTypes = /^(null|NaN|undefined)$/;
var commentRE = /((\/\*[\s\S]*?\*\/|\/\*[\s\S]*)|(\/\/.*))/;
var stringRE =
  /('(((\\)+(')?)|([^']))*')|("(((\\)+(")?)|([^"]))*")|(`(((\\)+(`)?)|([^`]))*`)/;
var regexRE =
  /^\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/;
var builtInObject =
  /^(AggregateError|Buffer|Array|ArrayBuffer|AsyncFunction|AsyncGenerator|AsyncGeneratorFunction|Atomics|BigInt|BigInt64Array|BigUint64Array|Boolean|DataView|Date|Error|EvalError|Float32Array|Float64Array|Function|Generator|GeneratorFunction|Int16Array|Int32Array|Int8Array|InternalError|Intl|JSON|Map|Math|Number|Object|Promise|Proxy|RangeError|ReferenceError|Reflect|RegExp|Set|SharedArrayBuffer|String|Symbol|SyntaxError|TypeError|URIError|Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|WeakMap|WeakSet|WebAssembly)$/;
const NR = document.getElementById("numberRow");
const EDITOR = document.getElementById("editor");

//global variables for functionalities
var lineCount = 1;
var fontSize = 16; // in px
var w_h = 0.5498367766955267; // width÷height of a monospace number
var numberWidth = w_h * fontSize;
document
  .querySelector(":root")
  .style.setProperty("--fontSize", fontSize + "px");
function highlight(container, text) {
  var lineCount = (text.match(/\n/g)?.length || 0) + 1;
  var d1 = window.performance.now();
  tokens = tokenise(text);
  var markuped = parse(tokens);
  var dt = window.performance.now() - d1;
  var lineNo = new Array(lineCount).fill(1);
  lineNo.forEach((k, i) => {
    lineNo[i] = "<span class='intent'>" + (i + 1) + "</span>";
  });
  NR.innerHTML = lineNo.join("\n");
  document
    .querySelector(":root")
    .style.setProperty(
      "--intent-width",
      String(lineCount).length * numberWidth + "px"
    );
  container.innerHTML = markuped;
  var speed = len / dt; //b/ms
  console.log(`run time = ${dt} ms
analysed: ${Math.round(len / 1.024) / 1000}kb input (@ ${
    Math.round(speed * 1000) / 1000
  } kb/s)
found: ${tokens.length} tokens
`);
  return tokens;
}

function tokenise(text) {
  len = text.length;
  var tokens = [],
    word = "";

  for (var i = 0; i < len; i++) {
    var char = text[i];
    // debugger
    if (!char.match(nameCharRE)) {
      // word analysis
      if (word != "") {
        tokens.push(readWordToken(word));
        //  mergeTextTypes();
      }
      var next2 = text.substring(i, i + 2);
      // analysin various symbols

      if (char == "\n") {
        tokens.push({type: E});
      } else if (next2 == "//" || next2 == "/*") {
        // comment
        var comment = text.substring(i, len).match(commentRE)[0];
        i += comment.length - 1;
        comment = comment.b().split("\n");
        comment.forEach((line, index) => {
          tokens.push({ type: F, token: line});
          if (index < comment.length-1) tokens.push({ type: E});
        });
        // tokens.push({ type: F, token: d});
      } else if (char.match(/['"`]/)) {
        var str = text.substring(i, len).match(stringRE)[0];
        i += str.length - 1;
        tokens.push({ type: A, token: str.b() });
      } else if (char.match(operatorRE)[0]) {
        // math operators
        if (char == "/") {
          var re = text.substring(i, len).match(regexRE);
          if (re) {
            tokens.push({ type: N, token: re[0] });
            i += re[0].length;
          }
        }
        var operStr = text.substring(i).match(operatorRE)[0];
        i += operStr.length - 1;
        tokens.push({
          type: D,
          token: operStr.b(),
        });
      } else if (char == "(") {
        // function name
        var tl = tokens.length;
        var prev = tokens[tl - 1];
        var prevt = prev.token || "";
        var pprev = tokens[tl - 2];
        var ppprev = tokens[tl - 3];
        tokens.push({ type: O, token: "(" });
        const isFunctionClause =
          prevt == "function" ||
          pprev?.token == "function" ||
          ppprev?.token == "function";
        /** if following condition is true then it would be function clause
         * cases:
         * 1: function name (args)
         * 2: function name(args)
         * 3: function (args)
         * 4: function(args)
         */
        if (isFunctionClause) {
          // makes name of function colored to method
          if (prev.type == C && prevt.match(nameCharRE)) {
            prev.type = M;
          } else if (pprev?.type == C && pprev.token.match(nameCharRE)) {
            pprev.type = M;
          }

          // reads arguments
          if (next2 != "()") {
            [args, i] = readArgumentsToken(i);
            tokens = tokens.concat(args);
          }
        } else if (
          prevt.match(nameCharRE) &&
          /[a-zA-Z0-9_$\s]+/.test(
            (prevt.a().match(/^(\s)*[a-zA-Z0-9_$\s]+/) || [""])[0]
          )
        ) {
          //this is function calling clause
          if (prev.type.match(/(TEXT|OBJECTPROP)/) && prevt.match(nameCharRE)) {
            prev.type = I;
          } else if (
            pprev?.type.match(/(TEXT|OBJECTPROP)/) &&
            pprev.token.match(nameCharRE)
          ) {
            pprev.type = I;
          } else if (
            ppprev?.type.match(/(TEXT|OBJECTPROP)/) &&
            ppprev.token.match(nameCharRE)
          ) {
            ppprev.type = I;
          }
        }
      } else {
        tokens.push({ type: C, token: char });
      }
      word = "";
    } else if (char.match(nameCharRE)) {
      word += char;
    }
    mergeTextTypes();
  }
  if (word != "") tokens.push(readWordToken(word));
  return tokens;

  function mergeTextTypes() {
    if (
      tokens.length > 1 &&
      tokens[tokens.length - 1].type == tokens[tokens.length - 2].type && tokens[tokens.length - 1].type != E
    ) {
      tokens[tokens.length - 2].token += tokens[tokens.length - 1].token;
      tokens.pop();
    }
  }
  function readArgumentsToken(k) {
    // reads and finds arguments of a function being defined
    var args = text.substring(k + 1).match(/[^)]*/)[0];
    const index = args.length + 1;
    var argarr = [];
    var w = "";
    for (var l = 0; l < args.length; l++) {
      var ch = args[l]
      if (ch.match(nameCharRE)) {
        w += ch
      } else {
        if (ch.match(/[\t ]/)) {
          w += ch;
          continue
        } else {
          argarr.push({type: J, token: w});
          if (ch == "\n") argarr.push({type: E});
          w = "";
        }
      }
    }
    if (text[k + index] == ")") argarr.push({ type: C, token: ")" }); // adds right paren if it was there
    return [argarr, index + k];
  }

  // finds the type of word given
  function readWordToken(word) {
    try {
      tokens[tokens.length - 1]?.token[0] != "."
    } catch (error) {
      console.log(252, tokens[tokens.length-1])
    }
    if (word.match(KeywordRE)) {
      // Keyword
      return { type: B, token: word };
    } else if (word.match(number)) {
      // a number
      return { type: G, token: word };
    } else if (
        word.match(builtInObject) &&
        tokens[tokens.length - 2]?.token != "function" &&
        (tokens[tokens.length - 1]?.token || "")[0] != "."
    ) {
        // builtin objects word 
        //eg: Buffer, Array, String, ...
        return { type: K, token: word };
    } else if (
      (tokens[tokens.length - 1]?.token || "").endsWith(".") ||
      (tokens[tokens.length - 2]?.token || "").endsWith(".")
    ) {
      return { type: L, token: word };
    } else if (word.match(nullTypes)) {
      return { type: P, token: word };
    } else {
      return { type: C, token: word };
    }
  }
}

function parse(tokens) {
  var formatted = "<span class='newline'>";
  for (var i = 0; i < tokens.length; i++) {
    var tkn = tokens[i],
      tokenType = tkn.type;
    if (tokenType.match(/(WS|TEXT|PAREN)/)) {
      formatted += tkn.token;
    } else if (tokenType == E) {
      formatted += "</span><span class='newline'>";
    } else if (tokenType == L) {
      formatted += "<span class='objprop'>" + tkn.token + "</span>";
    } else if (tokenType == B) {
      formatted += "<span class='keyword'>" + tkn.token + "</span>";
    } else if (tokenType == F) {
      formatted += "<span class='comment'>" + tkn.token + "</span>";
    } else if (tokenType == G) {
      formatted += "<span class='number'>" + tkn.token + "</span>";
    } else if (tokenType == I) {
      formatted += "<span class='function'>" + tkn.token + "</span>";
    } else if (tokenType == J) {
      formatted += "<span class='argument'>" + tkn.token + "</span>";
    } else if (tokenType == K) {
      formatted += "<span class='capital'>" + tkn.token + "</span>";
    } else if (tokenType == M) {
      formatted += "<span class='method'>" + tkn.token + "</span>";
    } else if (tokenType == A) {
      formatted += "<span class='string'>" + tkn.token + "</span>";
    } else if (tokenType == N) {
      formatted += "<span class='regex'>" + tkn.token + "</span>";
    } else if (tokenType == D) {
      formatted += "<span class='operator'>" + tkn.token + "</span>";
    } else if (tokenType == P) {
      formatted += "<span class='nulltype'>" + tkn.token + "</span>";
    }
  }
  return formatted;
}
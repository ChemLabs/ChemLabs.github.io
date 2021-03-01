
var database = firebase.database();

var elementsInMolecule = [];

var result = {};

var molStr = "";

var lastNum = "";

const molecularFormulaTextBox = document.getElementById("moleculeText");

var alertIncrement = 0;

const molDict = {
  "H2O": [962, "H2O", 0],
  "CH4": [297, "CH4", 0],
  "NH3": [222, "NH3", 0],
  "CO2": [280, "CO2", 0],
  "O3": [24823, "O3", 0]
}

const elementColorDict = {
  "H": "FFFFFF",
  "C": "C3C3C3",
  "N": "567BFF",
  "O": "FF302F",
  "F": "C4FF7B",
  "P": "FFB521",
  "S": "FDFF53",
  "Cl": "40FF43",
  "Se": "FEDB21",
  "Br": "D64E4D",
  "I": "C721C7",
  "At": "A77B70"
}

var elementsCurrenetlyUsed = [];

const allowedElementSymbols = ["H", "C", "N", "O", "F", "P", "S", "Cl", "Se", "Br", "I", "At"]

function getElement(elementDiv) {
  var chip = elementDiv.firstElementChild;
  var frontFace = chip.firstElementChild;
  var frontChildren = frontFace.children;
  var elementSymbol = frontChildren[1].innerHTML;

  moleculeCharacters = molStr.split("");

  lastNum = "";

  getLastNum(0);

  var lastElement = "";

  if (lastNum != 1) {
    for (i = 0; i < lastNum.length; i++) {
      var useless = moleculeCharacters.pop();
    }
  }

  var elementLength = elementSymbol.length;
  var previousElement = "";

  if (elementLength <= moleculeCharacters.length) {
    previousElement = moleculeCharacters.slice(-1 * elementLength).join("");

    if (previousElement == elementSymbol) {
      moleculeCharacters.push((parseInt(lastNum) + 1).toString());
      molStr = moleculeCharacters.join("");

      var molecularFormula = molecularFormulaTextBox.value;
      var updatedMolForm = "";
      if (lastNum != 1) {
        updatedMolForm = molecularFormula.substring(0, molecularFormula.length - lastNum.length);
      } else {
        updatedMolForm = molecularFormula;
      }

      var lastNumDigits = (parseInt(lastNum) + 1).toString().split("");

      lastNumDigits.forEach(item => updatedMolForm += String.fromCharCode(8320 + parseInt(item)));

      molecularFormulaTextBox.value = updatedMolForm;

    } else {
      molecularFormulaTextBox.value += elementSymbol;
      molStr += elementSymbol;
    }

  } else if (molStr == "") {
    molecularFormulaTextBox.value += elementSymbol;
    molStr += elementSymbol;
  } else {
    alert("Your molecule doesn't make sense.");
  }



  moleculeName = createCompound();

  molecularFormulaTextBox.style.color = "#eee";

}

function getLastNum(characterNum) {
  var temp = characterNum + 1;
  moleculeCharacters = molStr.split("");
  if (moleculeCharacters.length > characterNum) {
    var lastChar = moleculeCharacters[moleculeCharacters.length - (characterNum + 1)];
    var lastCharAsInt = parseInt(lastChar);
    if (!isNaN(lastCharAsInt)) {
      var lastNumPlaceholder = lastNum
      lastNum = lastChar.concat(lastNumPlaceholder);
      getLastNum(temp);
    } else if (lastNum == "") {
      lastNum = "1";
    }
  }

}

function clear() {
  molecularFormulaTextBox.value = "";
  molStr = "";
  lastNum = "0";
  elementsInMolecule = [];
}

function getStructure() {

  var molecules = molStr.split(/(?=[A-Z0-9])/);
  var validMol = true;
  molecules.forEach (molChar => {
     if (isNaN(molChar) && !allowedElementSymbols.includes(molChar)) {
       validMol = false;
       return;
    }
  });

  if (!validMol) {
    swal ( "Invalid Molecular Formula" ,  "Check to makes sure this molecule includes no metals, metalloids, or noble gases. Also makes sure that you used proper capitalization for the molecule." ,  "error" );
  } else {

    elementsCurrentlyUsed = [];
    var moleculeTypeList = molecules.filter(x => isNaN(x)); //List of all molecules, numbers removed
    var uniqueMolecules = [];
    $.each(moleculeTypeList, function(i, el){
        if($.inArray(el, uniqueMolecules) === -1) uniqueMolecules.push(el);
    });
    elementsCurrentlyUsed = elementsCurrentlyUsed.concat(uniqueMolecules);
    elementsCurrentlyUsed.sort();

    removeChemElements();

    elementsCurrentlyUsed.forEach(molId => addChemElement(molId));

    document.getElementById("elementsUsedDiv").style.display="none";

    if ($('#molViewer').length > 0) {
      removeElement("molViewer");
      removeElement("moleculeForm");
    }

    getMolData();
  }
}

const modelMolecule = async (formula) => {
  window.scrollBy(0, 500);
  const response = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/formula/".concat(formula, "/JSON?AllowOtherElements=false&MaxRecords=1"));
  const responseJson = await response.json(); //extract JSON from the http response
  const listKey = responseJson["Waiting"]["ListKey"];

  var responseCid = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/" + listKey + "/cids/JSON");
  var responseCidJson = await responseCid.json();

  while (responseCidJson.hasOwnProperty("Waiting")) {
    responseCid = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/" + listKey + "/cids/JSON");
    responseCidJson = await responseCid.json();
    //document.getElementById("json").textContent = JSON.stringify(responseCidJson, undefined, 2);
  }

  if (responseCidJson.hasOwnProperty("Fault")) {
    removeElement("loading");
    swal ( "Invalid Molecular Formula" ,  "This molecule does not exist in the database. Check to make sure that the molecule is typed correctly" ,  "error" );
  } else if (responseCidJson.hasOwnProperty("IdentifierList")) {
    document.getElementById("elementsUsedDiv").style.display="block";
    addMolFormHeader();
    addMolViewer("molViewer", "molViewer");
    const cid = String(responseCidJson["IdentifierList"]["CID"][0])

    const srcCid = "https://embed.molview.org/v1/?mode=balls&cid=".concat(cid);
    document.getElementById("molViewer").src = srcCid;

    var responseFormula = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/property/MolecularFormula,Charge/JSON");
    var responseFormulaJson = await responseFormula.json();
    //document.getElementById("json").textContent = JSON.stringify(responseFormulaJson, undefined, 2);

    var responseFormulaName = responseFormulaJson["PropertyTable"]["Properties"][0]["MolecularFormula"];
    var responseCharge = responseFormulaJson["PropertyTable"]["Properties"][0]["Charge"]

    var moleculeInfo = "Molecule Formula: " + responseFormulaName;

    if (responseCharge != 0) {
      moleculeInfo += '\xa0\xa0\xa0\xa0\xa0\xa0\xa0' + "Charge: " + responseCharge;
    }

    writeNewMolecule(formula, cid, responseFormulaName, responseCharge);

    document.getElementById("moleculeForm").innerHTML = moleculeInfo;
  }


}

function fx(e) {
  if (!/[a-zA-Z0-9]+/.test(String.fromCharCode(e.which))) {
    return false;
  }
  var inputStart = e.target.selectionStart;
  var inputEnd = e.target.selectionEnd;
  var tempMolStr = molStr.slice(0, inputStart) + String.fromCharCode(e.which) + molStr.slice(inputEnd);
  molStr = tempMolStr;


  var k = String.fromCharCode(e.which);

  if (k.match(/\d/)) {
    var r = String.fromCharCode(8320 + Number(k));
    try { //IE
      document.selection.createRange().text = r;
    } catch (x) { //others
      var o = e.target
      var intStart = o.selectionStart;
      var intEnd = o.selectionEnd;
      o.value = (o.value).substring(0, intStart) + r +
      (o.value).substring(intEnd, o.value.length);
      o.selectionStart = o.selectionEnd = intStart + r.length;
      o.focus();
    }
    return false;
  }
  return true;
}

function setElementUsed() {

}

molecularFormulaTextBox.onkeydown = function() {
  var key = event.keyCode || event.charCode;

  if (key == 8 || key == 46) {
    var inputStart = molecularFormulaTextBox.selectionStart;
    var inputEnd = molecularFormulaTextBox.selectionEnd;
    var tempMolStr = ""
    if (inputStart == inputEnd) {
      tempMolStr = molStr.slice(0, inputStart - 1) + molStr.slice(inputStart);
    } else {
      tempMolStr = molStr.slice(0, inputStart) + molStr.slice(inputEnd);
    }
    molStr = tempMolStr;

  }

};

molecularFormulaTextBox.onkeyup = function() {
  if (molecularFormulaTextBox.value == "") {
    molStr = "";
  }
}


$("#moleculeText").keypress(fx);

$("#moleculeText").keypress(function(event) {
  if (event.keyCode == 13) {
    event.preventDefault();
    getStructure();
    this.blur();
  } else if (event.keyCode == 32 || event.keyCode == 17) {
    event.preventDefault();
    event.stopPropagation();
  }
});

$("#moleculeText").keydown(function(e) {
  if (e.metaKey) {
    event.stopPropagation();
    event.preventDefault();
  }
});

molecularFormulaTextBox.ondrop = function preventDrop (e) {
    e.preventDefault();
};

window.onload = () => {
 molecularFormulaTextBox.onpaste = e => e.preventDefault();
}

function addMolViewer(elementId, elementClass) {
    var p = document.getElementById("moleculeDiv");
    var newElement = document.createElement("iframe");
    newElement.setAttribute('id', "molViewer");
    newElement.setAttribute('class', "molViewer");
    newElement.setAttribute("style", "width: 500px; height: 300px;")
    newElement.setAttribute("frameborder", "0");
    p.appendChild(newElement);
}

function addMolFormHeader() {
  var p = document.getElementById("moleculeDiv");
  var newElement = document.createElement("h4");
  newElement.setAttribute('id', "moleculeForm");
  newElement.setAttribute('class', "moleculeName");
  newElement.innerHTML = "Molecular Formula: ";
  p.appendChild(newElement);
}

function addLoading() {
  var p = document.getElementById("moleculeDiv");
  var newElement = document.createElement("span");
  newElement.setAttribute("id", "loading");
  newElement.setAttribute("class", "loader");

  p.appendChild(newElement);
}

function addChemElement(elementId) {
  var p = document.getElementById("elementsUsedDiv");
  var newElement = document.createElement("span");
  newElement.setAttribute("id", elementId);
  newElement.setAttribute("class", "elementsUsed");
  newElement.setAttribute("style", "color:#" + elementColorDict[elementId]);
  newElement.innerHTML = " " + elementId + " ";
  p.appendChild(newElement);
}

function removeChemElements() {
  $("#elementsUsedDiv").empty();
}

function removeElement(elementId) {
    // Removes an element from the document
    var element = document.getElementById(elementId);
    element.parentNode.removeChild(element);
}

function debugAlert() {
  alert(alertIncrement);
  alertIncrement++;
}

function writeNewMolecule(userTypedMol, cidVal, cidMolName, molCharge) {
  firebase.database().ref('molDict/' + userTypedMol).set({
    charge: molCharge,
    molName: cidMolName,
    cid : cidVal
  });
}

const getMolData = async () => {
  addLoading();
  var snapshot = await database.ref("molDict/" + molStr).once("value");
  if (snapshot.exists()) {
    var molData = await snapshot.val();

    document.getElementById("elementsUsedDiv").style.display="block";
    addMolFormHeader();
    addMolViewer("molViewer", "molViewer");

    window.scrollBy(0, 500);
    const srcCid = "https://embed.molview.org/v1/?mode=balls&cid=".concat(String(molData["cid"]));
    document.getElementById("molViewer").src = srcCid;
    removeElement("loading");

    var moleculeInfo = "Molecule Formula: " + String(molData["molName"]);

    if (molData["charge"] != 0) {
      moleculeInfo += '\xa0\xa0\xa0\xa0\xa0\xa0\xa0' + "Charge: " + String(molData["charge"]);
    }

    document.getElementById("moleculeForm").innerHTML = moleculeInfo;

  } else {
    modelMolecule(molStr);
  }

}

document.getElementById("clear").onclick = clear;
document.getElementById("create").onclick = getStructure;

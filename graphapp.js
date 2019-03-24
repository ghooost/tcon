"use strict";
function GraphAppCreator(queryForParent,file,schemeId){
  var graphs=[];
  fetch(file)
  .then(function(response){
    return response.json();
  })
  .then(function(data){
    var baseNode=document.querySelector(queryForParent);
    if(data.length && baseNode){
      baseNode.classList.add(schemeId);
      for(var cnt=0,m=data.length;cnt<m;cnt++){
        var o=document.createElement('div');
        o.className="graph-app";
        o.id="graphApp"+cnt;
        baseNode.appendChild(o);
        graphs.push(GraphApp('#'+o.id,data[cnt],schemeId));
      }
    }
    var schemeLabel=function(schemeId){
      return schemeId=='day' ?
        'Switch to Night mode' :
        'Switch to Day mode'
    };
    var o=document.createElement('a');
    o.className="graph-app-scheme";
    o.innerHTML=schemeLabel(schemeId);
    o.addEventListener('click',function(){
      baseNode.classList.remove(schemeId);
      schemeId=schemeId=='day'?'night':'day';
      baseNode.classList.add(schemeId);
      graphs.forEach(function(item){
        item.setScheme(schemeId);
      })
      this.innerHTML=schemeLabel(schemeId);
    },true);
    baseNode.appendChild(o);
  })
}


function GraphApp(queryForParent, chartData, schemeId){
  var baseNode=document.querySelector(queryForParent);
  if(!baseNode) throw "GraphApp: there is no object for query "+queryForParent;

  var font='lighter 14px Verdana';

  var schemes={
    'day':{
      colorLabels: function(opacity){return 'rgba(0,0,0,'+opacity+')'},
      colorLabelsOpacity: 0.3,
      colorLines: function(opacity){return 'rgba(180,180,180,'+opacity+')'},
      colorLinesOpacity: 0.3,
      colorPoints: '#ffffff',
      colorBarMain: 'rgba(160,160,180,0.2)',
      colorBarFrame: 'rgba(180,180,180,0.5)'
    },
    'night':{
      colorLabels: function(opacity){return 'rgba(256,256,256,'+opacity+')'},
      colorLabelsOpacity: 0.5,
      colorLines: function(opacity){return 'rgba(0,0,0,'+opacity+')'},
      colorLinesOpacity: 0.3,
      colorPoints: '#000000',
      colorBarMain: 'rgba(0,0,0,0.2)',
      colorBarFrame: 'rgba(180,180,180,0.5)'
    }
  };

  var colorLabels=undefined;
  var colorLabelsStatic=undefined;
  var colorLabelsOpacity=undefined;
  var colorLines=undefined;
  var colorLinesStatic=undefined;
  var colorLinesOpacity=undefined;
  var colorPoints=undefined;
  var colorBarMain=undefined;
  var colorBarFrame=undefined;

  var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var trans=[1,2,3,3,2,1];

  var bottomBar=null;
  var dataFrame=null;
  var mainGraph=null;
  var axisX=null;
  var axisY=null;
  var arrowLevel=null;
  var checkersLevel=null;
  var marksLevel=null;
/**
 * Model
 */
 var _width=0;
 var _height=0;

 var _dataLength=undefined;
 var _dx=undefined;
 var _lines=[];
 var _x=[];

 var _dataFrameStart=0;
 var _dataFrameStartX=undefined;
 var _dataFrameEnd=0;

 var _dataFrameWidth=undefined;

 var _visibleMaxValue=0;
 var _visibleLines=[];
 var _visibleDx=undefined;

 var _indexToMark=undefined;

 function init(schemeId){
   bottomBar=new BottomBar();
   bottomBar.attach(baseNode,1);

   dataFrame=new DataFrame();
   dataFrame.attach(baseNode,2);

   mainGraph=new MainGraph();
   mainGraph.attach(baseNode,3);

   axisX=new AxisX();
   axisX.attach(baseNode,4);

   axisY=new AxisY();
   axisY.attach(baseNode,5);

   arrowLevel=new ArrowLevel();
   arrowLevel.attach(baseNode,6);

   checkersLevel=new CheckersLevel();
   checkersLevel.attach(baseNode,7);

   marksLevel=new MarksLevel();
   marksLevel.attach(baseNode,8);

   SET_SCHEME(schemeId);
   DATA_LOADED(chartData);
 }

/**
* ACTIONS
*/
function SET_SCHEME(schemeId){

  var scheme=schemes[schemeId];

  colorLabels=scheme.colorLabels;
  colorLabelsStatic=colorLabels(scheme.colorLabelsOpacity);
  colorLabelsOpacity=scheme.colorLabelsOpacity;
  colorLines=scheme.colorLines;
  colorLinesStatic=colorLines(scheme.colorLinesOpacity);
  colorLinesOpacity=scheme.colorLinesOpacity;
  colorPoints=scheme.colorPoints;
  colorBarMain=scheme.colorBarMain;
  colorBarFrame=scheme.colorBarFrame;

  bottomBar.inValidate();
  dataFrame.inValidate();
  mainGraph.inValidate();
  axisX.inValidate();
  axisY.inValidate();
  arrowLevel.inValidate();
}


function CHANGE_APP_SIZE(w,h){
  _width=w;
  _height=h;
  _dx=_width/(_dataLength-1);

  var mainGraphTop=0;
  var axisHeight=90;
  var bottomBarHeight=100;
  var checkersHeight=100;

  var mainGraphHeight=_height-mainGraphTop-checkersHeight-bottomBarHeight-axisHeight;
  var axisTop=mainGraphTop+mainGraphHeight;
  var bottomBarTop=axisTop+axisHeight;
  var checkersTop=bottomBarTop+bottomBarHeight;

  mainGraph.doResize(0,mainGraphTop,_width,mainGraphHeight);

  bottomBar.doResize(0,bottomBarTop,_width,bottomBarHeight);
  dataFrame.doResize(0,bottomBarTop,_width,bottomBarHeight);
  axisX.doResize(0,axisTop,_width,axisHeight);
  axisY.doResize(0,mainGraphTop,_width,mainGraphHeight);

  arrowLevel.doResize(0,mainGraphTop,_width,mainGraphHeight);

  checkersLevel.doResize(0,checkersTop,_width,checkersHeight);
  marksLevel.doResize(0,mainGraphTop,_width,mainGraphHeight);

  DATAFRAME_CHANGE(_dataFrameStart*_dx,_dataFrameEnd*_dx)
}

function DATAFRAME_MOVE(left){
  left=limitValue(left,0,_width-_dataFrameWidth);
  DATAFRAME_CHANGE(left,left+_dataFrameWidth)
}
function DATAFRAME_RESIZE_LEFT(left){
  var right=_dataFrameEnd*_dx;
  left=limitValue(left,0,right-100);
  DATAFRAME_CHANGE(left,right);
}
function DATAFRAME_RESIZE_RIGHT(right){
  var left=_dataFrameStart*_dx;
  right=limitValue(right,left+100,_width);
  DATAFRAME_CHANGE(left,right);
}

function DATAFRAME_CHANGE(left,right){
  var start=left/_dx;
  var end=right/_dx;

  _dataFrameWidth=right-left;

  _dataFrameStart=start;
  _dataFrameEnd=end;

  _visibleDx=_width/(_dataFrameEnd-_dataFrameStart);

  _dataFrameStartX=(Math.floor(_dataFrameStart)-_dataFrameStart)*_visibleDx;

  _visibleLines=_lines.map(function(item){
    return item.data.slice(Math.floor(_dataFrameStart),Math.ceil(_dataFrameEnd)+1);
  })
  var max_value=Math.max.apply(null,_lines.map(function(item,index){
    return item.visible?Math.max.apply(null,_visibleLines[index]):0;
  }));
  _visibleMaxValue=Math.ceil(max_value/5)*6;
  dataFrame.inValidate();
  mainGraph.inValidate();
  axisX.inValidate();
  axisY.inValidate();
  checkersLevel.inValidate();
}

function ARROW_MOVE(x){
  var index=Math.round(limitValue(
    (x+_dataFrameStartX)/_visibleDx+_dataFrameStart,
    _dataFrameStartX<0 ? _dataFrameStart+1 : _dataFrameStart,
    _dataFrameEnd
  ));

  if(_indexToMark!=index){
    _indexToMark=index;
    arrowLevel.inValidate();
    marksLevel.inValidate();
  };
}

function ARROW_OFF(){
  _indexToMark=undefined;
  arrowLevel.inValidate();
  marksLevel.inValidate();
}

function CHANGE_GRAPH_VISIBILITY(index){
  if(index!=undefined){
    _lines[index].visible=!_lines[index].visible;
  }
  DATAFRAME_CHANGE(_dataFrameStart*_dx,_dataFrameEnd*_dx);
  bottomBar.inValidate();
}
function DATA_LOADED(data){
  var acc=data.columns.reduce(function(acc,item){
    var id=item[0];
    switch(data.types[id]){
      case 'line':
        acc.lines.push({
          name:data.names[id],
          color:data.colors[id],
          data:item.slice(1),
          visible:true
        });
      break;
      case 'x':
        var arr=item.slice(1);
        acc.x=arr.map(function(item){
          var d=new Date(item);
          return {
            label:months[d.getMonth()]+" "+d.getDate(),
            mark:days[d.getDay()]+", "+months[d.getMonth()]+" "+d.getDate()
          };
        });
      break;
    }
    return acc;
  },{
    lines:[],
    x:null
  });
  _lines=acc.lines;
  _x=acc.x;
  _dataLength=_x.length;

  CHANGE_APP_SIZE(baseNode.offsetWidth,baseNode.offsetHeight);
  window.addEventListener('resize',function(){
    CHANGE_APP_SIZE(baseNode.offsetWidth,baseNode.offsetHeight);
  },true);
  CHANGE_GRAPH_VISIBILITY();
  DATAFRAME_CHANGE(_width*0.75,_width);

  checkersLevel.createControls();

  reDraw();
}

function limitValue(value,min,max){
  if(value<min) return min;
  if(value>max) return max;
  return value;
}

function reDraw(){
  bottomBar.onAnimationFrame();
  dataFrame.onAnimationFrame();
  mainGraph.onAnimationFrame();
  axisX.onAnimationFrame();
  axisY.onAnimationFrame();
  arrowLevel.onAnimationFrame();

  window.requestAnimationFrame(reDraw);
}

function mk(tagName, className, parentNode){
  var o=document.createElement(tagName);
  if(className){
    o.className=className;
  };
  if(parentNode){
    parentNode.appendChild(o);
  }
  return o;
}
/**
 * transition value for animation
 */
 function Transition(steps){
   this.steps=steps;
   this.nSteps=steps.length;
   this.total=steps.reduce(function(acc,item){
     return acc+item;
   },0);
   this.d=undefined;
   this.targetValue=undefined;
   this.step=undefined;
   this.currentValue=undefined;
   this.prog=0;
   this.startValue=undefined;
 }
 Transition.prototype.isInTransition=function(){
   return this.step!=undefined;
 }
 Transition.prototype.progress=function(){
   return this.prog/this.total;
 }
 Transition.prototype.transitTo=function(newValue){
   if(this.targetValue!=newValue){
     if(this.targetValue==undefined){
       return this.startValue=this.targetValue=this.currentValue=newValue;
     } else {
       this.startValue=this.currentValue;
       this.targetValue=newValue;
       this.d=(newValue-this.currentValue)/this.total;
       this.step=0;
       this.prog=0;
     }
   };
   if(this.step==undefined){
     return newValue;
   } else if(this.step<this.nSteps){
     this.currentValue+=this.d*this.steps[this.step];
     this.prog+=this.steps[this.step];
     this.step++;
   } else {
     this.step=undefined;
     this.prog=0;
     this.startValue=this.targetValue=this.currentValue=newValue;
   };
   return this.currentValue;
 }
 /**
  * div-based layer
  */
  function DomLayer(){}
  DomLayer.prototype.setup=function(){}
  DomLayer.prototype.attach=function(baseNode,zIndex){
    this.node=document.createElement('div');

    baseNode.appendChild(this.node);
    var style=this.node.style;
    style.position="absolute";
    style.zIndex=zIndex;

    this.setup()
  }
  DomLayer.prototype.inValidate=function(){
    this.doDraw();
  }
  DomLayer.prototype.doDraw=function(){
    //draw something
  }
  DomLayer.prototype.doResize=function(x,y,width,height){
    this.node.style.top=y+"px";
    this.node.style.left=x+"px";
    this.node.style.width=width+"px";
    this.node.style.height=height+"px";

    this.width=width;
    this.height=height;
    this.inValidate();
  }

/**
 * canvas-based layer
 */
 function CanvasLayer(){}
 CanvasLayer.prototype.setup=function(){}
 CanvasLayer.prototype.attach=function(baseNode,zIndex){
   this.width=0;
   this.height=0;

   this.isInvalidated=false;
   this.onScreenCanvas=document.createElement('canvas');
   this.onScreenContext=this.onScreenCanvas.getContext('2d');

   baseNode.appendChild(this.onScreenCanvas);
   var style=this.onScreenCanvas.style;
   style.position="absolute";
   style.zIndex=zIndex;

   this.setup()
 }
 CanvasLayer.prototype.inValidate=function(){
   this.isInvalidated=true;
 }
 CanvasLayer.prototype.doDraw=function(context){
   //draw something at the context
 }
 CanvasLayer.prototype.onAnimationFrame=function(){
   if(this.isInvalidated){
     this.isInvalidated=false;
     this.onScreenContext.clearRect(0,0,this.width,this.height);
     this.doDraw(this.onScreenContext);
   }
 }
 CanvasLayer.prototype.doResize=function(x,y,width,height){
   this.onScreenCanvas.style.top=y+"px";
   this.onScreenCanvas.style.left=x+"px";
   this.onScreenCanvas.style.width=width+"px";
   this.onScreenCanvas.style.height=height+"px";

   this.onScreenCanvas.setAttribute('width',width);
   this.onScreenCanvas.setAttribute('height',height);

   this.width=width;
   this.height=height;
   this.inValidate();
 }

/**
* graph layer
*/
function GraphLayer(){};
GraphLayer.prototype=new CanvasLayer();
GraphLayer.prototype.drawGraph=function(context,color,points,startX,startY,dx,dy){
  var h=this.height-startY;
  context.strokeStyle=color;
  context.beginPath();
  var x=startX;
  points.forEach(function(point,index){
    if(index){
      x+=dx;
      context.lineTo(Math.floor(x), Math.floor(h-point*dy));
    } else {
      context.moveTo(x, Math.floor(h-point*dy));
    }
  })
  context.stroke();
  context.closePath();
}

/**
 * bottom bar
 */
 function BottomBar(){};
 BottomBar.prototype=new GraphLayer();
 BottomBar.prototype.doDraw=function(context){
   var self=this;

   var maxValue=Math.max.apply(null,_lines.map(function(item){
     return item.visible?Math.max.apply(null,item.data):0;
   }));

   var dy=(this.height-6)/maxValue;
   _lines.forEach(function(item){
     if(item.visible)
       self.drawGraph(context,item.color,item.data,0,2,_dx,dy);
   });
 }

 /**
  * main graph window
  */
  function  MainGraph(){};
  MainGraph.prototype=new GraphLayer();
  MainGraph.prototype.setup=function(){
    this.visibleMaxValue=new Transition(trans);
  }
  MainGraph.prototype.doDraw=function(context){
    //debugger;
    var self=this;
    var dy=this.height/this.visibleMaxValue.transitTo(_visibleMaxValue);

    _lines.forEach(function(item,index){
      if(item.visible)
        self.drawGraph(context,item.color,_visibleLines[index],_dataFrameStartX,0,_visibleDx,dy);
    });
    if(this.visibleMaxValue.isInTransition()){
      this.inValidate();
    }
  }

  function  DataFrame(){};
  DataFrame.prototype=new CanvasLayer();
  DataFrame.prototype.setup=function(){
    this.w=10;
    this.hw=this.w/2;
    this.bh=2;
    this.onScreenCanvas.addEventListener('mousedown',this.onMouseDown.bind(this),true);
    this.onScreenCanvas.addEventListener('touchstart',this.onMouseDown.bind(this),true);
  }
  DataFrame.prototype.doDraw=function(context){
    context.fillStyle=colorBarMain;
    context.fillRect(0,0,this.width,this.height);
    context.fillStyle=colorBarFrame;
    var left=_dataFrameStart*_dx;
    var width=(_dataFrameEnd-_dataFrameStart)*_dx;
    context.fillRect(left-this.hw,0,width+this.w,this.height);
    context.clearRect(left+this.hw,this.bh,width-this.w,this.height-this.bh-this.bh);
  }

  DataFrame.prototype.onMouseDown=function(e){
    var self=this;
    var onMouseMove=this.onMouseMove.bind(this);
    var onMouseUp=function(){
      window.removeEventListener('touchmove',onMouseMove,true);
      window.removeEventListener('touchend',onMouseUp,true);
      window.removeEventListener('touchcancel',onMouseUp,true);

      window.removeEventListener('mousemove',onMouseMove,true);
      window.removeEventListener('mouseup',onMouseUp,true);
      window.removeEventListener('contextmenu',onMouseUp,true);
      self.drawMode=undefined;
    };
    window.addEventListener('touchmove',onMouseMove,true);
    window.addEventListener('touchend',onMouseUp,true);
    window.addEventListener('touchcancel',onMouseUp,true);

    window.addEventListener('mouseup',onMouseUp,true);
    window.addEventListener('contextmenu',onMouseUp,true);
    window.addEventListener('mousemove',onMouseMove,true);

    var area=this.onScreenCanvas.getBoundingClientRect();
    var localX=(e.touches? e.touches[0].clientX : e.clientX)-area.left;

    var left=_dataFrameStart*_dx;
    var right=_dataFrameEnd*_dx;

    var x0=left-this.hw;
    var x1=left+this.hw;
    var x2=right-this.hw;
    var x3=right+this.hw;

    if(localX>x1 && localX<x2){
      this.drawMode="moveWindow";
      this.dX=localX-left;
    } else if(localX<x1  && localX>x0 ){
      this.drawMode="moveLeft";
      this.dX=localX-left;
    } else if(localX<x3  && localX>x2){
      this.drawMode="moveRight";
      this.dX=localX-right;
    } else {
      this.drawMode=undefined;
    }
    this.onMouseMove(e);
  }

  DataFrame.prototype.onMouseMove=function(e){
    if(!this.drawMode) return;
    var area=this.onScreenCanvas.getBoundingClientRect();
    var localX=(e.touches? e.touches[0].clientX : e.clientX)-area.left-this.dX;

    switch(this.drawMode){
      case "moveWindow":
        DATAFRAME_MOVE(localX);
      break;
      case "moveLeft":
        DATAFRAME_RESIZE_LEFT(localX);
      break;
      case "moveRight":
        DATAFRAME_RESIZE_RIGHT(localX);
      break;
    }
  }

  function  AxisX(){};
  AxisX.prototype=new CanvasLayer();
  AxisX.prototype.setup=function(){
    this.visibleMaxValue=new Transition(trans);
  }

  AxisX.prototype.doDraw=function(context){
    var nPerFrame=_width/180;

    var step=Math.floor(Math.floor((_dataFrameEnd-_dataFrameStart)/nPerFrame)/4)*4;
    if(!step) step=1;

    var start=Math.floor(_dataFrameStart/step)*step;
    var x=_dataFrameStart*_visibleDx;

    context.font = font;
    context.fillStyle = colorLabelsStatic;
    context.textBaseline = "top";
    for(var cnt=start;cnt<_dataFrameEnd;cnt+=step){
      context.fillText(_x[cnt].label, Math.floor(cnt*_visibleDx-x), 20);
    }
  }

  function  AxisY(){};
  AxisY.prototype=new CanvasLayer();
  AxisY.prototype.setup=function(){
    this.visibleMaxValue=new Transition(trans);
  }
  AxisY.prototype.doDraw=function(context){
    var curMax=this.visibleMaxValue.transitTo(_visibleMaxValue);
    if(this.visibleMaxValue.isInTransition()){
      var startMax=this.visibleMaxValue.startValue;
      var startH=this.height/startMax*curMax;
      var destMax=this.visibleMaxValue.targetValue;
      var destH=this.height/destMax*curMax;

      var progress=this.visibleMaxValue.progress();

      var labelsOpacity=progress*colorLabelsOpacity;
      var linesOpacity=progress*colorLinesOpacity;


      this.doDrawProcedure(
        context,
        5,
        colorLinesOpacity - linesOpacity,
        colorLabelsOpacity - labelsOpacity,
        startMax,
        startH
      );
      this.doDrawProcedure(
        context,
        5,
        linesOpacity,
        labelsOpacity,
        destMax,
        destH
      );

      this.inValidate();
    } else {
      this.doDrawProcedure(
        context,
        5,
        colorLinesOpacity,
        colorLabelsOpacity,
        _visibleMaxValue,
        this.height
      );
    }
  }

  AxisY.prototype.doDrawProcedure=function(context,n,linesOpacity,labelsOpacity,max,height){
    var dy=height/n;
    var step=Math.ceil(max/n);

    context.font = font;
    context.fillStyle = colorLabels(labelsOpacity);
    context.textBaseline = "bottom";
    context.strokeStyle=colorLines(linesOpacity);
    context.beginPath();

    for(var cnt=0;cnt<=n;cnt++){
      var y=this.height-Math.floor(cnt*dy)-1;
      context.fillText(cnt*step, 0, y-16);
      context.moveTo(0, y);
      context.lineTo(_width, y);
    }
    context.stroke();
    context.closePath();
  }


  function  ArrowLevel(){};
  ArrowLevel.prototype=new CanvasLayer();
  ArrowLevel.prototype.setup=function(){
    this.onScreenCanvas.addEventListener('mousedown',this.onMouseDown.bind(this),true);
    this.onScreenCanvas.addEventListener('touchstart',this.onMouseDown.bind(this),true);
  }

  ArrowLevel.prototype.doDraw=function(context){
    if(_indexToMark != undefined){
      var x=Math.floor((_indexToMark-_dataFrameStart)*_visibleDx);
      context.strokeStyle=colorLinesStatic;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
      context.stroke();
      context.closePath();

      var dy=this.height/_visibleMaxValue;

      var self=this;

      _lines.forEach(function(item,index){
        if(item.visible)
          self.doDrawPoint(context,item.color,x,item.data[_indexToMark]*dy);
      });
    }
  }

  ArrowLevel.prototype.doDrawPoint=function(context,color,x,y){
    context.strokeStyle=color;
    context.fillStyle=colorPoints;
    context.beginPath();
    context.arc(x, this.height-y, 5, 0, Math.PI*2);
    context.fill();
    context.stroke();
    context.closePath();
  }

  ArrowLevel.prototype.onMouseDown=function(e){
    var self=this;
    var onMouseMove=this.onMouseMove.bind(this);
    var onMouseUp=function(){
      window.removeEventListener('touchmove',onMouseMove,true);
      window.removeEventListener('touchend',onMouseUp,true);
      window.removeEventListener('touchcancel',onMouseUp,true);

      window.removeEventListener('mousemove',onMouseMove,true);
      window.removeEventListener('mouseup',onMouseUp,true);
      window.removeEventListener('contextmenu',onMouseUp,true);
      ARROW_OFF();
    };
    window.addEventListener('touchmove',onMouseMove,true);
    window.addEventListener('touchend',onMouseUp,true);
    window.addEventListener('mouseup',onMouseUp,true);
    window.addEventListener('contextmenu',onMouseUp,true);
    window.addEventListener('mousemove',onMouseMove,true);
    this.onMouseMove(e);
  }

  ArrowLevel.prototype.onMouseMove=function(e){
    var area=this.onScreenCanvas.getBoundingClientRect();
    ARROW_MOVE((e.touches? e.touches[0].clientX : e.clientX)-area.left);
  }

  function CheckersLevel(){}
  CheckersLevel.prototype=new DomLayer();
  CheckersLevel.prototype.createControls=function(){
    var node=this.node;
    node.className="app-checkers"
    _lines.forEach(function(item,index){
      var o=document.createElement('a');
      o.className="app-checkers-a";
      o.setAttribute('data-index',index);
      o.innerHTML=item.name;
      var ind=document.createElement('span');
      ind.className="app-checkers-a-indicator";
      ind.style.borderColor=item.color;
      o.appendChild(ind);
      o.addEventListener('click',function(){
          CHANGE_GRAPH_VISIBILITY(index);
      },true);
      node.appendChild(o);
    });
    this.doDraw();
  }
  CheckersLevel.prototype.doDraw=function(){
    var indicators=Array.prototype.slice.call(this.node.querySelectorAll('.app-checkers-a-indicator'));

    indicators.forEach(function(item,index){
        item.style.backgroundColor=_lines[index].visible ? _lines[index].color : 'transparent';
    });
  }


  function MarksLevel(){}
  MarksLevel.prototype=new DomLayer();
  MarksLevel.prototype.doResize=function(x,y,width,height){
    this.width=width;
    if(this.isOn){
      var n=this.node;

      var left=n.offsetLeft;
      var width=n.offsetWidth;

      if(n.offsetLeft+n.offsetWidth > width){
        n.style.left=(width-n.offsetWidth)+"px";
      };
    }
  }

  MarksLevel.prototype.switchOn=function(){
    var node=this.node;
    node.innerHTML='';
    node.className="app-marks";

    this.dateContainer=mk('div','app-marks-date',node);

    var oMarks=mk('div','app-marks-items',node);
    var containers=[];
    _lines.forEach(function(item,index){
      if(item.visible){
        var oMark=mk('div','app-marks-items-marker',oMarks);
        oMark.style.color=item.color;

        containers.push({
          data:_lines[index].data,
          node:mk('div','app-marks-marker-value',oMark)
        })

        mk('div','app-marks-marker-name',oMark).innerHTML=item.name;
      }
    });
    this.containers=containers;
  }
  MarksLevel.prototype.doDraw=function(){
    if(_indexToMark != undefined){
      var node=this.node;

      if(!this.isOn){
        this.switchOn();
        this.isOn=true;
        node.style.opacity=1;
      }

      this.dateContainer.innerHTML=_x[_indexToMark].mark;

      this.containers.forEach(function(item){
        item.node.innerHTML=item.data[_indexToMark];
      })

      var x=Math.floor((_indexToMark-_dataFrameStart)*_visibleDx)-15;
      if(x<0) x=0;
      if(x+node.offsetWidth > this.width){
        x=this.width-node.offsetWidth;
      }
      node.style.left=x+"px";
    } else {
      if(this.isOn){
        this.node.style.opacity=0;
        this.containers=[];
        this.isOn=false;
      }
    }
  }

  init(schemeId);

  return {
    setScheme:SET_SCHEME
  }
}

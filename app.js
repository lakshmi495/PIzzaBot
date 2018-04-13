// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');

var pizzakind = null;
var quantity = null;
var orderdate = null;

let date = require('date-and-time');
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID || `ab7cfb0a-2ec2-45af-8a91-6d07a1de733b`,
    appPassword:process.env.MICROSOFT_APP_PASSWORD || `kgVZ00hilerAMUSZ465=!]#`
});
server.post('/api/messages', connector.listen());


var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send("Sorry.. I didn't understand....");
});

var luisAppUrl = `	https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/184169ec-81bc-47ca-8c04-6cb727951230?subscription-key=5364617766fc492e8ea5f45e859e487d&verbose=true&timezoneOffset=0&q=`
bot.recognizer(new builder.LuisRecognizer(luisAppUrl));
bot.dialog("OrderPizza",[
  function(session,args,next){
    console.log("args",args);
    var intent=args.intent;
    console.log("intent",intent);
    if (pizzakind==null){
    pizzakind=builder.EntityRecognizer.findEntity(intent.entities,'pizzaKind');}
    console.log("pizzakind",pizzakind);
    if(quantity==null){
    quantity=builder.EntityRecognizer.findEntity(intent.entities,'builtin.number');}
    console.log("quantity",quantity);
    if(orderdate==null){
    orderdate=builder.EntityRecognizer.findEntity(intent.entities,'builtin.datetimeV2.date');}
    console.log("orderdate",orderdate);
    var order= session.dialogData.order ={
      pizzakind: pizzakind ? pizzakind.entity : null,
      quantity: quantity ? quantity.entity : null,
      orderdate : orderdate ? orderdate.resolution.values[0] : null
    }
    console.log("order.pizzakind",order.pizzakind);
    console.log("order.quantity",order.quantity);
    console.log("order.orderdate",order.orderdate);
    var obj =order.orderdate;
        if(obj){
          var result = Object.keys(obj).map(function(key) {
            return [ obj[key]];
          });
          console.log("result",result[2]);
          order.orderdate=result[2];
          console.log("orderdate",order.orderdate);
        }

    if(!order.pizzakind){
      builder.Prompts.text(session,"sure, what type of pizza would you want me to order?");

    }else{
      next();
    }
  },
  function(session,results,next){

            if(results.response){
              session.beginDialog('kind');
            }else{
              next();
            }
          },
          function(session,results,next){
            var order= session.dialogData.order
            if(!order.quantity){
              builder.Prompts.number(session,"how many of them would you like to order?");
            }else{
              next();
            }
          },
  function(session,results,next){
    var order = session.dialogData.order;
    console.log("number",results.response);
    if(results.response){
      session.beginDialog('number');
    }
  else{
    next();
  }},
    function(session,results,next){
      var order = session.dialogData.order;
      if(!order.orderdate){
        builder.Prompts.time(session,"when do you prefer your order to be delivered?");
      }else{
        next();
      }
    },
  function(session,results){
    var order = session.dialogData.order;
    console.log("time",results.response);
    if(results.response){
      session.dialogData.time = builder.EntityRecognizer.resolveTime([results.response]);
      order.orderdate=date.format(session.dialogData.time, 'MM/DD/YYYY');
    }

    builder.Prompts.confirm(session,`Your order of ${order.pizzakind} ${order.quantity} will be delivered by ${order.orderdate}. Shall I confirm?`);

  },
  function(session,results){
    var order = session.dialogData.order;
    console.log("result",results.response);
   if(results.response==true){
      session.send(`Order confirmed. Order details: <br/>Type: ${order.pizzakind} <br/>quantity: ${order.quantity} <br/> date:${order.orderdate} `).endDialog();
      pizzakind=null;
      quantity=null;
      orderdate=null;
    }
    session.endDialog();
  }
]).triggerAction({
    matches: 'PizzaOrdering'
}).cancelAction('your order is cancelled.', "Okay, your order is not placed. See you again", {
    matches: /^(cancel|nevermind|no|not now)/i
});


bot.dialog('kind',[
  function(session,args){
    console.log("argskind",args);
    var intent=args.intent;
    console.log("kindintent",intent);
    var kindpizza=builder.EntityRecognizer.findEntity(intent.entities,'pizzaKind');
    console.log("kindpizza",kindpizza);
    var order= session.dialogData.order ={
      kindpizza: kindpizza ? kindpizza.entity : null
    }
    console.log("order.kindpizza",order.kindpizza);
    var args_to_pass = { action: '*:kind',
      intent:
       {
         intent: 'PizzaOrdering',
         entities: [ { entity: order.kindpizza,
           type: 'pizzaKind',
           startIndex: 9,
           endIndex: 11,
         /*resolution: { values: order.kindpizza }*/ } ],
         compositeEntities: [] },
      libraryName: '*' };
session.endDialogWithResult({response:order.kindpizza });
session.beginDialog('OrderPizza',args_to_pass);
  }
]).triggerAction({
    matches: 'values',
    onInterrupted: function (session) {
        session.send('Please provide a pizzakind');
    }
});

bot.dialog('number',[
  function(session,args){

    console.log("argskind",args);
    var intent=args.intent;
    console.log("kindintent",intent);
    var quantity=builder.EntityRecognizer.findEntity(intent.entities,'builtin.number');
    console.log("quantity",quantity);
    var order= session.dialogData.order ={
      quantity: quantity ? quantity.entity : null
    }
    console.log("order.quantity",order.quantity);
    var args_to_pass = { action: '*:number',
      intent:
       {
         intent: 'PizzaOrdering',
         entities: [ { entity: order.quantity,
           type: 'builtin.number',
           startIndex: 9,
           endIndex: 11 } ],
         compositeEntities: [] },
      libraryName: '*' };
  session.endDialogWithResult({response:order.quantity });
  session.beginDialog('OrderPizza',args_to_pass);
  }
]).triggerAction({
    matches: 'quantity',
    onInterrupted: function (session) {
        session.send('Please provide quantity');
    }
});

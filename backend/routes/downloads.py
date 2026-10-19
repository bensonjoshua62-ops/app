from fastapi import APIRouter
from fastapi.responses import Response
import os

router = APIRouter(prefix="/download", tags=["Downloads"])

EA_CODE = '''//+------------------------------------------------------------------+
//|                                                      IGRIS_EA.mq5 |
//|                                        Copyright 2024, IGRIS.app  |
//|                                               https://igris.app   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, IGRIS Trading System"
#property link      "https://igris.app"
#property version   "1.00"
#property description "IGRIS Trade Reporter - Sends trades to IGRIS platform"

//+------------------------------------------------------------------+
//|                     SETUP INSTRUCTIONS                            |
//+------------------------------------------------------------------+
//  1. Download this file (IGRIS_EA.mq5)
//  2. Open MetaTrader 5
//  3. Go to File -> Open Data Folder
//  4. Navigate to MQL5 -> Experts folder
//  5. Copy IGRIS_EA.mq5 into this folder
//  6. Restart MT5 or right-click Navigator -> Refresh
//  7. In Navigator panel, expand "Expert Advisors"
//  8. Drag IGRIS_EA onto any chart
//  9. In the EA settings popup:
//     - Enter your API Key (from IGRIS Dashboard -> Settings)
//     - Enter your Server URL (your IGRIS app URL)
//  10. Go to Tools -> Options -> Expert Advisors
//  11. Check "Allow WebRequest for listed URL"
//  12. Add your Server URL to the list
//  13. Click OK and ensure EA is enabled (smiley face in chart corner)
//+------------------------------------------------------------------+

//--- Input parameters
input string   ApiKey = "";                    // Your IGRIS API Key (from Dashboard)
input string   ServerUrl = "";                 // IGRIS Server URL (e.g., https://your-app.com)
input int      MagicNumber = 0;                // Magic Number (0 = all trades)
input bool     SendOpenTrades = true;          // Send open trade notifications
input bool     SendCloseTrades = true;         // Send close trade notifications

//--- Global variables
datetime lastTradeTime = 0;
int lastOrdersTotal = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   if(ApiKey == "")
   {
      Print("ERROR: Please set your IGRIS API Key in the EA settings");
      Print("You can find your API Key in IGRIS Dashboard -> API Settings");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
   if(ServerUrl == "")
   {
      Print("ERROR: Please set your IGRIS Server URL in the EA settings");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
   Print("===========================================");
   Print("IGRIS EA initialized successfully");
   Print("Server URL: ", ServerUrl);
   Print("Magic Number: ", MagicNumber == 0 ? "All trades" : IntegerToString(MagicNumber));
   Print("===========================================");
   
   // Send test connection
   Print("Testing connection to IGRIS server...");
   Print("IMPORTANT: Make sure to add ", ServerUrl, " to allowed URLs");
   Print("Go to: Tools -> Options -> Expert Advisors -> Allow WebRequest");
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("IGRIS EA deinitialized");
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckForNewTrades();
}

//+------------------------------------------------------------------+
//| Trade transaction handler                                          |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(dealTicket > 0)
      {
         ProcessDeal(dealTicket);
      }
   }
}

//+------------------------------------------------------------------+
//| Process a deal and send to IGRIS                                   |
//+------------------------------------------------------------------+
void ProcessDeal(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket))
      return;
   
   long dealMagic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   
   // Only process trades with our magic number or all trades if magic is 0
   if(MagicNumber != 0 && dealMagic != MagicNumber)
      return;
   
   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   
   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   datetime time = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
   long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   
   string tradeType = "";
   bool isOpenTrade = (entry == DEAL_ENTRY_IN);
   bool isCloseTrade = (entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY);
   
   if(dealType == DEAL_TYPE_BUY)
      tradeType = "BUY";
   else if(dealType == DEAL_TYPE_SELL)
      tradeType = "SELL";
   else
      return; // Skip non-trade deals
   
   // Check if we should send this trade
   if(isOpenTrade && !SendOpenTrades)
      return;
   if(isCloseTrade && !SendCloseTrades)
      return;
   
   // Build JSON payload
   string json = "{";
   json += "\\"symbol\\":\\"" + symbol + "\\",";
   json += "\\"type\\":\\"" + tradeType + "\\",";
   json += "\\"volume\\":" + DoubleToString(volume, 2) + ",";
   json += "\\"open_price\\":" + DoubleToString(price, 5) + ",";
   
   if(isCloseTrade)
   {
      json += "\\"close_price\\":" + DoubleToString(price, 5) + ",";
      json += "\\"profit\\":" + DoubleToString(profit, 2) + ",";
   }
   
   json += "\\"ticket\\":" + IntegerToString(dealTicket) + ",";
   json += "\\"magic_number\\":" + IntegerToString(dealMagic) + ",";
   json += "\\"comment\\":\\"" + comment + "\\"";
   json += "}";
   
   // Send to IGRIS
   SendToServer(json);
}

//+------------------------------------------------------------------+
//| Check for new trades (backup method)                               |
//+------------------------------------------------------------------+
void CheckForNewTrades()
{
   int currentOrders = PositionsTotal();
   
   if(currentOrders != lastOrdersTotal)
   {
      ProcessRecentHistory();
      lastOrdersTotal = currentOrders;
   }
}

//+------------------------------------------------------------------+
//| Process recent trade history                                       |
//+------------------------------------------------------------------+
void ProcessRecentHistory()
{
   datetime fromTime = TimeCurrent() - 60; // Last minute
   
   if(!HistorySelect(fromTime, TimeCurrent()))
      return;
   
   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0)
      {
         datetime dealTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         if(dealTime > lastTradeTime)
         {
            ProcessDeal(ticket);
            lastTradeTime = dealTime;
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send data to IGRIS server                                          |
//+------------------------------------------------------------------+
void SendToServer(string json)
{
   string url = ServerUrl + "/api/trades/webhook";
   string headers = "Content-Type: application/json\\r\\nX-API-Key: " + ApiKey;
   
   char post[];
   char result[];
   string resultHeaders;
   
   StringToCharArray(json, post, 0, StringLen(json));
   
   int res = WebRequest(
      "POST",
      url,
      headers,
      5000,
      post,
      result,
      resultHeaders
   );
   
   if(res == -1)
   {
      int error = GetLastError();
      Print("WebRequest error: ", error);
      Print("===========================================");
      Print("TROUBLESHOOTING:");
      Print("1. Go to Tools -> Options -> Expert Advisors");
      Print("2. Check 'Allow WebRequest for listed URL'");
      Print("3. Add this URL: ", ServerUrl);
      Print("4. Click OK and try again");
      Print("===========================================");
   }
   else if(res == 200 || res == 201)
   {
      Print("Trade sent to IGRIS successfully!");
   }
   else
   {
      Print("Server response code: ", res);
      Print("Response: ", CharArrayToString(result));
   }
}
//+------------------------------------------------------------------+
'''


@router.get("/ea")
async def download_ea():
    """Download the MT5 Expert Advisor file."""
    return Response(
        content=EA_CODE,
        media_type="text/plain",
        headers={
            "Content-Disposition": "attachment; filename=IGRIS_EA.mq5"
        }
    )

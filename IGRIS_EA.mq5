//+------------------------------------------------------------------+
//|                                                    IGRIS_EA.mq5 |
//|                                          IGRIS Trading Platform |
//|                          MVP Production-Ready Signal Sender     |
//+------------------------------------------------------------------+
#property copyright "IGRIS Trading Platform"
#property link      "https://igris-trading-fix.preview.emergentagent.com"
#property version   "2.0"
#property description "IGRIS EA - Sends trade signals to IGRIS platform"

#include <Trade\Trade.mqh>

//--- Input parameters
input string   IGRIS_URL = "https://igris-trading-fix.preview.emergentagent.com/api/signals/webhook";
input string   IGRIS_API_KEY = "IGRIS_MVP_SECRET_KEY_2024";  // API Key for authentication
input string   BOT_ID = "IGRIS_EA";                          // Bot identifier
input int      CheckIntervalSeconds = 5;                      // Check interval
input bool     SendOnNewTrade = true;                         // Send on new trade
input bool     SendOnTradeClose = true;                       // Send on trade close

//--- Global variables
CTrade trade;
datetime lastCheck = 0;
ulong lastTicket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("IGRIS EA v2.0 initialized");
   Print("Webhook URL: ", IGRIS_URL);
   Print("Bot ID: ", BOT_ID);
   
   // Test connection on startup
   TestConnection();
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Test webhook connection                                            |
//+------------------------------------------------------------------+
void TestConnection()
{
   Print("Testing webhook connection...");
   
   // Send a test signal
   string json = "{" +
      "\"bot_id\":\"" + BOT_ID + "\"," +
      "\"symbol\":\"TEST\"," +
      "\"type\":\"TEST\"," +
      "\"entry\":0," +
      "\"sl\":0," +
      "\"tp\":0," +
      "\"message\":\"Connection test from " + BOT_ID + "\"}";
   
   if(SendHTTPPost(json))
      Print("✓ Webhook connection successful!");
   else
      Print("✗ Webhook connection failed. Check URL and API key.");
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   if(TimeCurrent() - lastCheck < CheckIntervalSeconds)
      return;
   
   lastCheck = TimeCurrent();
   
   if(SendOnNewTrade)
      CheckNewPositions();
}

//+------------------------------------------------------------------+
//| Check for new positions                                            |
//+------------------------------------------------------------------+
void CheckNewPositions()
{
   int total = PositionsTotal();
   
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      
      if(ticket > lastTicket)
      {
         if(PositionSelectByTicket(ticket))
         {
            SendTradeSignal(ticket, "NEW");
            lastTicket = ticket;
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send trade signal to IGRIS - MVP Format                           |
//+------------------------------------------------------------------+
bool SendTradeSignal(ulong ticket, string signalType)
{
   if(!PositionSelectByTicket(ticket))
      return false;
   
   string symbol = PositionGetString(POSITION_SYMBOL);
   ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   double sl = PositionGetDouble(POSITION_SL);
   double tp = PositionGetDouble(POSITION_TP);
   double volume = PositionGetDouble(POSITION_VOLUME);
   double profit = PositionGetDouble(POSITION_PROFIT);
   
   string direction = (posType == POSITION_TYPE_BUY) ? "BUY" : "SELL";
   
   // Build message
   string msg = direction + " " + symbol;
   if(sl > 0 && tp > 0)
   {
      double risk = MathAbs(openPrice - sl);
      double reward = MathAbs(tp - openPrice);
      if(risk > 0)
         msg += " | R:R 1:" + DoubleToString(reward/risk, 1);
   }
   
   // MVP JSON format
   string json = "{" +
      "\"bot_id\":\"" + BOT_ID + "\"," +
      "\"symbol\":\"" + symbol + "\"," +
      "\"type\":\"" + direction + "\"," +
      "\"entry\":" + DoubleToString(openPrice, 5) + "," +
      "\"sl\":" + DoubleToString(sl, 5) + "," +
      "\"tp\":" + DoubleToString(tp, 5) + "," +
      "\"volume\":" + DoubleToString(volume, 2) + "," +
      "\"ticket\":" + IntegerToString(ticket) + "," +
      "\"profit\":" + DoubleToString(profit, 2) + "," +
      "\"message\":\"" + msg + "\"}";
   
   return SendHTTPPost(json);
}

//+------------------------------------------------------------------+
//| Handle trade transactions (for close signals)                      |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(!SendOnTradeClose)
      return;
      
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(HistoryDealSelect(dealTicket))
      {
         ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         
         if(entry == DEAL_ENTRY_OUT)
         {
            SendCloseSignal(dealTicket);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send close signal                                                  |
//+------------------------------------------------------------------+
bool SendCloseSignal(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket))
      return false;
   
   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   
   string profitStr = (profit >= 0) ? "+" + DoubleToString(profit, 2) : DoubleToString(profit, 2);
   string msg = "CLOSED " + symbol + " | P/L: $" + profitStr;
   
   string json = "{" +
      "\"bot_id\":\"" + BOT_ID + "\"," +
      "\"symbol\":\"" + symbol + "\"," +
      "\"type\":\"CLOSE\"," +
      "\"entry\":" + DoubleToString(price, 5) + "," +
      "\"sl\":0," +
      "\"tp\":0," +
      "\"volume\":" + DoubleToString(volume, 2) + "," +
      "\"profit\":" + DoubleToString(profit, 2) + "," +
      "\"message\":\"" + msg + "\"}";
   
   return SendHTTPPost(json);
}

//+------------------------------------------------------------------+
//| Send HTTP POST - MVP Implementation                                |
//+------------------------------------------------------------------+
bool SendHTTPPost(string jsonPayload)
{
   char post[];
   char result[];
   string responseHeaders;
   
   // Headers with API key authentication
   string headers = "Content-Type: application/json\r\n";
   headers += "Authorization: Bearer " + IGRIS_API_KEY + "\r\n";
   
   // Convert JSON to char array
   StringToCharArray(jsonPayload, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1); // Remove null terminator
   
   int timeout = 5000;
   
   ResetLastError();
   int res = WebRequest(
      "POST",
      IGRIS_URL,
      headers,
      timeout,
      post,
      result,
      responseHeaders
   );
   
   if(res == -1)
   {
      int error = GetLastError();
      Print("IGRIS EA: Request failed. Error: ", error);
      
      if(error == 4060)
      {
         Print(">>> Add URL to allowed list: Tools -> Options -> Expert Advisors");
         Print(">>> URL to add: ", IGRIS_URL);
      }
      
      return false;
   }
   
   // Check response
   if(res == 200 || res == 201)
   {
      string response = CharArrayToString(result);
      Print("IGRIS EA: Signal sent! Response: ", response);
      return true;
   }
   else
   {
      Print("IGRIS EA: Unexpected response code: ", res);
      return false;
   }
}

//+------------------------------------------------------------------+
//| Manual signal function - Call this to send custom signals         |
//+------------------------------------------------------------------+
void SendManualSignal(string symbol, string type, double entry, double sl, double tp, string message = "")
{
   if(message == "")
      message = type + " " + symbol + " - Manual Signal";
   
   string json = "{" +
      "\"bot_id\":\"" + BOT_ID + "_MANUAL\"," +
      "\"symbol\":\"" + symbol + "\"," +
      "\"type\":\"" + type + "\"," +
      "\"entry\":" + DoubleToString(entry, 5) + "," +
      "\"sl\":" + DoubleToString(sl, 5) + "," +
      "\"tp\":" + DoubleToString(tp, 5) + "," +
      "\"message\":\"" + message + "\"}";
   
   if(SendHTTPPost(json))
      Print("Manual signal sent successfully!");
   else
      Print("Failed to send manual signal.");
}
//+------------------------------------------------------------------+

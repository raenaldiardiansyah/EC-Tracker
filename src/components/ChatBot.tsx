import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageCircle, 
  X, 
  Send, 
  MapPin, 
  Utensils, 
  Bus, 
  Sparkles,
  User,
  Bot,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

interface TouristSpot {
  name: string;
  category: 'wisata' | 'kuliner' | 'transport';
  description: string;
  location?: string;
  priceRange?: string;
  mustTry?: string[];
  bestTime?: string;
}

const LOCAL_KNOWLEDGE: Record<string, TouristSpot[]> = {
  wisata: [
    {
      name: "Taman Lalu Lintas Ade Irma Suryani",
      category: "wisata",
      description: "Taman edukasi lalu lintas yang cocok untuk keluarga dengan berbagai wahana permainan.",
      location: "Jl. Belitung No.1, Merdeka",
      priceRange: "Rp 10.000 - Rp 15.000",
      bestTime: "Weekend pagi"
    },
    {
      name: "Museum Konperensi Asia Afrika",
      category: "wisata",
      description: "Museum bersejarah yang menyimpan memorabilia Konferensi Asia Afrika 1955.",
      location: "Jl. Asia Afrika No.65",
      priceRange: "Rp 10.000",
      bestTime: "Selasa-Minggu 08.00-16.00"
    },
    {
      name: "Kawah Putih Ciwidey",
      category: "wisata",
      description: "Danau kawah vulkanik dengan air berwarna putih kehijauan yang memukau.",
      location: "Ciwidey, ±30km dari Bojongsoang",
      priceRange: "Rp 30.000 - Rp 50.000",
      bestTime: "Pagi hari untuk kabut terbaik"
    },
    {
      name: "Trans Studio Bandung",
      category: "wisata",
      description: "Theme park indoor terbesar dengan berbagai wahana seru.",
      location: "Jl. Gatot Subroto No.289",
      priceRange: "Rp 200.000 - Rp 300.000",
      bestTime: "Weekday untuk antrian lebih singkat"
    }
  ],
  kuliner: [
    {
      name: "Batagor Kingsley",
      category: "kuliner",
      description: "Batagor legendaris Bandung dengan bumbu kacang yang khas.",
      location: "Jl. Veteran No.25",
      priceRange: "Rp 15.000 - Rp 30.000",
      mustTry: ["Batagor goreng", "Siomay", "Es teler"]
    },
    {
      name: "Mie Kocok Kebon Jukut",
      category: "kuliner",
      description: "Mie kocok dengan kuah kaldu sapi yang gurih dan kikil empuk.",
      location: "Jl. Kebon Jukut No.5",
      priceRange: "Rp 20.000 - Rp 35.000",
      mustTry: ["Mie kocok spesial", "Mie yamin"]
    },
    {
      name: "Sate Hadori",
      category: "kuliner",
      description: "Sate ayam dengan bumbu kacang khas Sunda yang manis-gurih.",
      location: "Jl. Cibaduyut",
      priceRange: "Rp 25.000 - Rp 50.000",
      mustTry: ["Sate ayam", "Sate kambing", "Lontong"]
    },
    {
      name: "Kopi Toko Djawa",
      category: "kuliner",
      description: "Kedai kopi vintage dengan suasana kolonial yang cozy.",
      location: "Braga",
      priceRange: "Rp 20.000 - Rp 40.000",
      mustTry: ["Kopi tubruk", "Roti bakar", "Pisang goreng"]
    },
    {
      name: "Warung Nasi Ampera",
      category: "kuliner",
      description: "Rumah makan Sunda dengan lauk pauk lengkap dan sambal terasi.",
      location: "Jl. Sunda No.2",
      priceRange: "Rp 30.000 - Rp 60.000",
      mustTry: ["Ayam goreng", "Ikan asin", "Sayur asem", "Sambal terasi"]
    }
  ],
  transport: [
    {
      name: "Koridor 1 (Cicaheum-Cibeureum)",
      category: "transport",
      description: "Rute utama yang melewati pusat kota dan Alun-alun Bandung.",
      location: "Stasiun Cicaheum - Terminal Cibeureum",
      bestTime: "Hindari jam 07-09 dan 16-18"
    },
    {
      name: "Koridor 2 (Cicaheum-Cibeureum via Aceh)",
      category: "transport",
      description: "Alternatif rute melalui Jl. Aceh untuk menghindari kemacetan.",
      location: "Via Jl. Aceh",
      bestTime: "Jam sibuk sebagai alternatif"
    },
    {
      name: "Koridor 5 (Antapani-Cicaheum)",
      category: "transport",
      description: "Rute yang menghubungkan Antapani dengan Cicaheum.",
      location: "Antapani - Cicaheum",
      bestTime: "Sesuai jadwal operasional"
    }
  ]
};

const WELCOME_MESSAGE = `Halo! 👋 Saya **BojongBot**, asisten virtual wisata & kuliner Anda di Bojongsoang dan sekitarnya! 

Saya bisa membantu Anda dengan:
• 🗺️ **Rekomendasi wisata** terbaik di Bandung
• 🍜 **Spot kuliner** hits & legendaris
• 🚌 **Info transportasi** & koridor Trans Metro Bandung
• 💡 **Tips perjalanan** lokal

Ada yang bisa saya bantu hari ini? 😊`;

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      addBotMessage(WELCOME_MESSAGE, [
        "Wisata terbaik di Bandung",
        "Kuliner legendaris",
        "Info koridor Trans Metro",
        "Tips hemat berwisata"
      ]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addBotMessage = (content: string, quickReplies?: string[], delay = 1000) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content,
        timestamp: new Date(),
        quickReplies
      }]);
    }, delay);
  };

  const handleSend = (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    
    generateResponse(text.toLowerCase());
  };

  const generateResponse = (query: string) => {
    let response = "";
    let quickReplies: string[] = [];

    if (query.includes('halo') || query.includes('hi') || query.includes('hey')) {
      response = "Halo! Senang bertemu dengan Anda! 🌟 Mau explore wisata atau cari makanan enak hari ini?";
      quickReplies = ["Wisata alam", "Kuliner malam", "Museum", "Kafe hits"];
    }
    else if (query.includes('wisata') || query.includes('tempat') || query.includes('liburan') || query.includes('jalan-jalan')) {
      const spots = LOCAL_KNOWLEDGE.wisata;
      response = `**Rekomendasi Wisata Terbaik:**\n\n`;
      spots.forEach((spot, idx) => {
        response += `${idx + 1}. **${spot.name}**\n`;
        response += `📍 ${spot.location}\n`;
        response += `💰 ${spot.priceRange}\n`;
        response += `⏰ ${spot.bestTime}\n`;
        response += `📝 ${spot.description}\n\n`;
      });
      response += `💡 *Tips: Pagi hari adalah waktu terbaik untuk mengunjungi wisata alam!*`;
      quickReplies = ["Kuliner terdekat", "Transportasi ke sana", "Tips hemat", "Wisata gratis"];
    }
    else if (query.includes('makan') || query.includes('kuliner') || query.includes('restoran') || query.includes('warung') || query.includes('cafe') || query.includes('kopi')) {
      const foods = LOCAL_KNOWLEDGE.kuliner;
      response = `**Rekomendasi Kuliner Bojongsoang & Bandung:**\n\n`;
      foods.forEach((food, idx) => {
        response += `${idx + 1}. **${food.name}** ${food.category === 'kuliner' ? '🍽️' : '☕'}\n`;
        response += `📍 ${food.location}\n`;
        response += `💰 ${food.priceRange}\n`;
        if (food.mustTry) {
          response += `⭐ Wajib coba: ${food.mustTry.join(", ")}\n`;
        }
        response += `📝 ${food.description}\n\n`;
      });
      response += `🤤 *Jangan lupa bawa uang cash ya, beberapa tempat belum menerima QRIS!*`;
      quickReplies = ["Wisata terdekat", "Cafe cozy", "Makanan pedas", "Budget mahasiswa"];
    }
    else if (query.includes('transport') || query.includes('bus') || query.includes('koridor') || query.includes('trans metro') || query.includes('angkot')) {
      const trans = LOCAL_KNOWLEDGE.transport;
      response = `**Info Transportasi Trans Metro Bandung:**\n\n`;
      trans.forEach((t, idx) => {
        response += `🚌 **${t.name}**\n`;
        response += `📍 Rute: ${t.location}\n`;
        response += `⏰ ${t.bestTime}\n`;
        response += `📝 ${t.description}\n\n`;
      });
      response += `💳 *Gunakan kartu BRIZZI atau T-Money untuk pembayaran lebih mudah!*`;
      quickReplies = ["Jadwal bus", "Tarif terbaru", "Halte terdekat", "Tips naik bus"];
    }
    else if (query.includes('tips') || query.includes('hemat') || query.includes('murah') || query.includes('budget')) {
      response = `**Tips Wisata Hemat di Bandung:** 💰\n\n`;
      response += `1. **Transportasi**\n   • Gunakan Trans Metro Bandung (Rp 3.600/trip)\n   • Naik angkot untuk jarak dekat\n   • Sewa sepeda di Dago atau Braga\n\n`;
      response += `2. **Kuliner**\n   • Coba warung nasi padang atau warteg untuk makan siang\n   • Happy hour di kafe (biasanya 15.00-18.00)\n   • Street food di Sabtu Malam di Jalan Cibadak\n\n`;
      response += `3. **Wisata**\n   • Kunjungi taman kota (Alun-alun, Taman Lansia - gratis!)\n   • Museum Konferensi Asia Afrika (Rp 10.000)\n   • Tracking di Tebing Keraton (Rp 15.000)\n\n`;
      response += `4. **Waktu Terbaik**\n   • Weekday untuk hotel lebih murah\n   • Hindari musim libur panjang\n\n`;
      response += `✨ *Dengan budget Rp 200.000/hari, Anda sudah bisa menikmati Bandung dengan puas!*`;
      quickReplies = ["Itinerary 1 hari", "Hotel murah", "Wisata gratis", "Kuliner hemat"];
    }
    else if (query.includes('terima kasih') || query.includes('thanks') || query.includes('makasih')) {
      response = "Sama-sama! 😊 Senang bisa membantu. Jangan lupa share pengalaman wisata Anda ya! \n\nJika butuh bantuan lagi, saya siap 24/7! 🚀";
      quickReplies = ["Tutup chat", "Kembali ke menu"];
    }
    else {
      response = `Maaf, saya belum paham maksud Anda. 🤔\n\nCoba ketik salah satu dari berikut:\n• "Wisata terbaik"\n• "Kuliner legendaris"\n• "Info transportasi"\n• "Tips hemat"\n\nAtau pilih menu cepat di bawah! 👇`;
      quickReplies = ["Wisata", "Kuliner", "Transportasi", "Tips"];
    }

    addBotMessage(response, quickReplies);
  };

  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  const handleReset = () => {
    setMessages([]);
    addBotMessage(WELCOME_MESSAGE, [
      "Wisata terbaik di Bandung",
      "Kuliner legendaris",
      "Info koridor Trans Metro",
      "Tips hemat berwisata"
    ], 500);
    toast.success("Percakapan direset");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 group"
            >
              <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-md"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-primary"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      BojongBot 
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                    </h3>
                    <p className="text-xs text-white/80">Local Guide Expert</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/30 min-h-[400px] max-h-[500px]">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[80%] space-y-2`}>
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted border border-border rounded-tl-sm'
                      }`}>
                        <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                          {message.content.split('**').map((part, i) => 
                            i % 2 === 0 ? part : <strong key={i} className="font-bold">{part}</strong>
                          )}
                        </div>
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`text-[10px] text-muted-foreground ${
                        message.type === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {formatTime(message.timestamp)}
                      </div>

                      {/* Quick Replies */}
                      {message.quickReplies && message.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {message.quickReplies.map((reply, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickReply(reply)}
                              className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors border border-primary/20"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                          className="w-2 h-2 rounded-full bg-primary/60"
                        />
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-primary/60"
                        />
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-primary/60"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ketik pertanyaan Anda..."
                    className="flex-1 rounded-full border-primary/20 focus-visible:ring-primary"
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isTyping}
                    className="rounded-full px-4 bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Quick Action Chips */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => handleQuickReply("Wisata terdekat")}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    <MapPin className="h-3 w-3" />
                    Wisata
                  </button>
                  <button
                    onClick={() => handleQuickReply("Kuliner enak")}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    <Utensils className="h-3 w-3" />
                    Kuliner
                  </button>
                  <button
                    onClick={() => handleQuickReply("Info koridor")}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    <Bus className="h-3 w-3" />
                    Transport
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
import { useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface SearchControlProps {
    onLocationSelect: (lat: number, lng: number, displayName: string) => void;
}

interface SearchResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
}

export const SearchControl = ({ onLocationSelect }: SearchControlProps) => {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setShowResults(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    query + " West Java" // Add context to search
                )}&limit=5`
            );

            if (!response.ok) throw new Error("Gagal mencari lokasi");

            const data = await response.json();
            setResults(data);

            if (data.length === 0) {
                toast.info("Lokasi tidak ditemukan");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat mencari lokasi");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (result: SearchResult) => {
        onLocationSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
        setQuery(result.display_name.split(",")[0]); // Show only main name
        setShowResults(false);
        setResults([]);
    };

    return (
        <div className="absolute top-6 left-6 z-[1000] w-full max-w-sm px-4 md:px-0">
            <div className="flex gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border">
                <Input
                    placeholder="Cari lokasi (cth: UNESA, Tunjungan Plaza)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="bg-background"
                />
                <Button size="icon" onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {showResults && results.length > 0 && (
                <Card className="mt-2 bg-background/95 backdrop-blur-sm p-2 shadow-xl border-t-0 max-h-60 overflow-y-auto">
                    <div className="flex flex-col gap-1">
                        {results.map((result) => (
                            <Button
                                key={result.place_id}
                                variant="ghost"
                                className="justify-start h-auto py-2 px-3 text-left font-normal"
                                onClick={() => handleSelect(result)}
                            >
                                <MapPin className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                <span className="truncate">{result.display_name}</span>
                            </Button>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

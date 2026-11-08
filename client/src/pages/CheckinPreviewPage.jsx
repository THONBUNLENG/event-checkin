import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";

const DEFAULT_TEXT = "សូមស្កេនទីនេះ";

export default function CheckinPreviewPage() {
    const [searchParams] = useSearchParams();

    const eventId = searchParams.get("eventId");

    const [event, setEvent] = useState(null);
    const [displayName, setDisplayName] =
        useState(DEFAULT_TEXT);

    const [participant, setParticipant] = useState(null);

    const resetTimer = useRef(null);

    // ---------------------------------------
    // Fetch selected event
    // ---------------------------------------
    useEffect(() => {
        if (!eventId) return;

        async function loadEvent() {
            try {
                const { data } = await api.get("/events");

                const found = data.find(
                    (e) => String(e.id) === String(eventId)
                );

                setEvent(found || null);
            } catch (err) {
                console.error("Failed to load event:", err);
            }
        }

        loadEvent();
    }, [eventId]);

    // ---------------------------------------
    // Listen for Check-in scans
    // ---------------------------------------
    useEffect(() => {
        const channel = new BroadcastChannel(
            "checkin-live-preview"
        );

        channel.onmessage = (message) => {
            const data = message.data;

            if (data?.type === "CHECKIN") {
                showParticipant(data);
            }

            if (data?.type === "EVENT") {
                setEvent(data.event);
            }
        };

        return () => {
            channel.close();

            if (resetTimer.current) {
                clearTimeout(resetTimer.current);
            }
        };
    }, []);

    // ---------------------------------------
    // Show participant for 300ms
    // ---------------------------------------
    function showParticipant(data) {
        if (!data?.name) return;

        setParticipant(data);
        setDisplayName(data.name);

        if (resetTimer.current) {
            clearTimeout(resetTimer.current);
        }

        resetTimer.current = setTimeout(() => {
            setDisplayName(DEFAULT_TEXT);
            setParticipant(null);
        }, 800);
    }

    // ---------------------------------------
    // Fullscreen only when user clicks
    // ---------------------------------------
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    return (
        <div className="fixed inset-0 bg-[#00638F] text-white overflow-hidden">

            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `
            linear-gradient(
              rgba(255,255,255,.08) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,.08) 1px,
              transparent 1px
            )
          `,
                    backgroundSize: "32px 32px",
                }}
            />

            {/* Decorative background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-[8%] top-[20%] w-5 h-5 bg-white/5" />
                <div className="absolute left-[20%] top-[55%] w-6 h-6 bg-white/5" />
                <div className="absolute right-[12%] top-[18%] w-7 h-7 bg-white/5" />
                <div className="absolute right-[20%] bottom-[20%] w-5 h-5 bg-white/5" />
                <div className="absolute left-[30%] bottom-[12%] w-5 h-5 bg-white/5" />
            </div>

            {/* Main */}
            <div className="relative z-10 h-full flex flex-col items-center text-center px-8 pt-32">

                {/* Logo */}
                <h1 className="text-4xl md:text-5xl font-bold leading-8 md:leading-[60px] pb-6"
                    style={{
                        fontFamily: '"Khmer OS Muol Light", "Khmer OS Battambang", sans-serif',
                    }}
                >
                    កម្មវិធី
                </h1>

                {/* Event title */}
                <div
                    className="max-w-6xl"
                    style={{
                        fontFamily: '"Khmer OS Muol Light", "Khmer OS Battambang", sans-serif',
                    }}
                >
                    <h1 className="text-4xl md:text-4xl font-bold leading-8 md:leading-[60px] pb-4">
                        {event?.name || "Loading event..."}
                    </h1>
                    <div className="">
                        <img
                            className="mx-auto h-32 md:h-10 object-cover"
                            src="/images/kbach.png"
                            alt=""
                        />
                    </div>
                    <h1 className=" mt-4 text-4xl md:text-5xl font-bold leading-8 md:leading-[60px] pb-6"
                        style={{
                            fontFamily: '"Khmer OS Muol Light", "Khmer OS Battambang", sans-serif',
                        }}
                    >
                        សូមស្វាគមន៍
                    </h1>
                    {/* Scan message */}
                    <div
                        className="flex-1 flex items-center justify-center pb-20"
                        style={{
                            fontFamily:
                                '"Noto Sans Khmer", "Khmer OS Battambang", sans-serif',
                        }}
                    >
                        <div>
                            <div
                                className={`font-bold transition-none ${displayName === DEFAULT_TEXT
                                        ? "text-4xl md:text-4xl mt-12"
                                        : "text-4xl md:text-4xl mt-12"
                                    }`}
                            >
                                {displayName}
                            </div>

                            
                        </div>
                    </div>
                    {/* Location */}
                    {event?.location && (
                        <div className="text-xl md:text-2xl font-bold leading-8 md:leading-[40px] pb-4 mt-12">
                            {event.location}
                        </div>
                    )}
                </div>


            </div>

            {/* Fullscreen button */}
            <button
                onClick={toggleFullscreen}
                className="fixed bottom-5 right-5 z-50
                   w-12 h-12 rounded-xl
                   bg-black/20 hover:bg-black/40
                   flex items-center justify-center
                   text-2xl"
                title="Fullscreen"
            >
                ⛶
            </button>
        </div>
    );
}
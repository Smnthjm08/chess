import { RoomProvider } from "@/components/providers/room-providers"

const InRoomLayout = ({children}: {children: React.ReactNode}) =>{
return (
    <div>
        <RoomProvider>
            {children}
        </RoomProvider>
    </div>
)
}

export default InRoomLayout;
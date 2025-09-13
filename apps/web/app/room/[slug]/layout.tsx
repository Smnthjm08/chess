import { RoomProvider } from "@/components/providers/room-context"

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
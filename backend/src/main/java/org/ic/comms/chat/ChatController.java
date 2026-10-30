package org.ic.comms.chat;

import java.time.Duration;
import java.util.Collection;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/channels")
public class ChatController {

    private static final CacheControl CHANNELS_CACHE = CacheControl.maxAge(Duration.ofHours(1)).cachePublic();

    private final ChatService chatService;
    private final ChannelCatalog channels;
    private final ChatHistory history;

    public ChatController(ChatService chatService, ChannelCatalog channels, ChatHistory history) {
        this.chatService = chatService;
        this.channels = channels;
        this.history = history;
    }

    @GetMapping
    public ResponseEntity<Collection<Channel>> channels() {
        return ResponseEntity.ok().cacheControl(CHANNELS_CACHE).body(channels.all());
    }

    @GetMapping("/{channelId}/messages")
    public List<ChatMessage> recentMessages(@PathVariable String channelId) {
        if (!channels.exists(channelId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown channel");
        }
        return history.recent(channelId);
    }

    @MessageMapping("/chat.send")
    public void send(@Payload SendMessageCommand command,
                     @Header(SimpMessageHeaderAccessor.SESSION_ID_HEADER) String sessionId) {
        chatService.post(command, sessionId);
    }
}

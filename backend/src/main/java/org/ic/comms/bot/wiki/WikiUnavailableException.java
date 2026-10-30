package org.ic.comms.bot.wiki;

public class WikiUnavailableException extends RuntimeException {

    public WikiUnavailableException(String message) {
        super(message);
    }

    public WikiUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

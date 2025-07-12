package cache

import (
	"context"
	"time"
	"github.com/valkey-io/valkey-go"
)

type Client struct {
	client valkey.Client
}

func Connect(valkeyURL string) (*Client, error) {
	client, err := valkey.NewClient(valkey.ClientOption{
		InitAddress: []string{valkeyURL},
	})
	if err != nil {
		return nil, err
	}
	
	// Test connection
	err = client.Do(context.Background(), client.B().Ping().Build()).Error()
	if err != nil {
		return nil, err
	}
	
	return &Client{client: client}, nil
}

func (c *Client) Get(ctx context.Context, key string) (string, error) {
	result := c.client.Do(ctx, c.client.B().Get().Key(key).Build())
	return result.ToString()
}

func (c *Client) Set(ctx context.Context, key, value string, ttl int) error {
	return c.client.Do(ctx, c.client.B().Set().Key(key).Value(value).Ex(time.Duration(ttl)*time.Second).Build()).Error()
}

func (c *Client) Delete(ctx context.Context, key string) error {
	return c.client.Do(ctx, c.client.B().Del().Key(key).Build()).Error()
}
export interface OAuthToken {
  accessToken: string;
  userId: string;
  clientId: string;
  refreshToken?: string;
  scope?: string[];
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
}

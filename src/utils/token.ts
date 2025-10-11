import jwt, { SignOptions } from 'jsonwebtoken';
import env from '@/config/env';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  tokenId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string => {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload, type: 'access' }, env.ACCESS_TOKEN_SECRET, options);
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>): string => {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload, type: 'refresh' }, env.REFRESH_TOKEN_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
};

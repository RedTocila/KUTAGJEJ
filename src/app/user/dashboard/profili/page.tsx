'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowSquareOut as ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { Envelope as EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { Globe as GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkedinLogo as LinkedinLogoIcon } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';
import { Lock as LockIcon } from '@phosphor-icons/react/dist/ssr/Lock';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { TiktokLogo as TiktokLogoIcon } from '@phosphor-icons/react/dist/ssr/TiktokLogo';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';

import { pathsPublicMemberProfile } from '@/paths';
import { clientFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth/client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { rememberListingLocation } from '@/lib/listing-form-defaults';
import { memberInitials, mergeMemberReferralBadges, type PublicMemberReferralBadge } from '@/lib/public-member-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { DEFAULT_SHARE_THEME_COLOR, normalizeShareThemeColor } from '@/lib/share-theme-color';
import { useUser } from '@/hooks/use-user';
import { SearchableSelect } from '@/components/core/searchable-select';
import { TransientSuccessAlert } from '@/components/core/transient-success-alert';
import { MemberReferralBadgesRow, MemberReferralBadgesSkeleton } from '@/components/public/member-referral-badges';
import { ListingVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { AccountVerificationCard } from '@/components/user/account-verification-card';
import { LockedIdentityField } from '@/components/user/locked-identity-field';
import { useOwnerEditHeaderActions } from '@/components/user/owner-edit-header-actions';
import { PortalSectionCard, PortalSurface } from '@/components/user/portal-cards';
import { ShareThemeColorPicker } from '@/components/user/share-theme-color-picker';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

function publicDisplayName(user: {
  accountType?: string;
  role?: string;
  businessName?: string;
  businessOwner?: string;
  firstName?: string;
  lastName?: string;
}): string {
  const isBusiness = user.accountType === 'business' || user.role === 'business-user';
  if (isBusiness) {
    return (
      String(user.businessName || '').trim() ||
      String(user.businessOwner || '').trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      'Biznes'
    );
  }
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Individ';
}

export default function UserProfilePage() {
  const { user, checkSession } = useUser();
  const searchParams = useSearchParams();
  const upgradeBusiness = searchParams.get('upgrade') === 'business';
  const businessUpgradeRef = React.useRef<HTMLDivElement | null>(null);

  const isBusiness = Boolean(user && (user.accountType === 'business' || user.role === 'business-user'));
  const canEdit =
    Boolean(user) &&
    (user?.accountType === 'individual' || user?.accountType === 'business' || user?.role === 'business-user');

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [businessName, setBusinessName] = React.useState('');
  const [businessOwner, setBusinessOwner] = React.useState('');
  const [businessCategory, setBusinessCategory] = React.useState('');
  const [niptInput, setNiptInput] = React.useState('');
  const [phoneInput, setPhoneInput] = React.useState('');
  const [basedCityId, setBasedCityId] = React.useState('');
  const [shareThemeColor, setShareThemeColor] = React.useState(DEFAULT_SHARE_THEME_COLOR);
  const [instagramUrl, setInstagramUrl] = React.useState('');
  const [tiktokUrl, setTiktokUrl] = React.useState('');
  const [linkedinUrl, setLinkedinUrl] = React.useState('');
  const [websiteUrl, setWebsiteUrl] = React.useState('');
  const [isPrivate, setIsPrivate] = React.useState(Boolean(user?.isPrivate));
  const [privacyBusy, setPrivacyBusy] = React.useState(false);
  const [privacyMsg, setPrivacyMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const privacyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(false);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [convertSaving, setConvertSaving] = React.useState(false);
  const [convertMsg, setConvertMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [avatarBusy, setAvatarBusy] = React.useState(false);
  const [avatarMsg, setAvatarMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [referralBadges, setReferralBadges] = React.useState<PublicMemberReferralBadge[]>([]);
  const [referralBadgesLoading, setReferralBadgesLoading] = React.useState(true);

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setFirstName(typeof user.firstName === 'string' ? user.firstName : '');
    setLastName(typeof user.lastName === 'string' ? user.lastName : '');
    setBusinessName(typeof user.businessName === 'string' ? user.businessName : '');
    setBusinessOwner(
      typeof user.businessOwner === 'string' && user.businessOwner.trim()
        ? user.businessOwner
        : [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    );
    setBusinessCategory(typeof user.businessCategory === 'string' ? user.businessCategory : '');
    setNiptInput(typeof user.nipt === 'string' ? user.nipt : '');
    setPhoneInput(typeof user.phone === 'string' ? user.phone : '');
    setBasedCityId(typeof user.basedCityId === 'string' ? user.basedCityId : '');
    setShareThemeColor(normalizeShareThemeColor(user.shareThemeColor));
    setInstagramUrl(typeof user.instagramUrl === 'string' ? user.instagramUrl : '');
    setTiktokUrl(typeof user.tiktokUrl === 'string' ? user.tiktokUrl : '');
    setLinkedinUrl(typeof user.linkedinUrl === 'string' ? user.linkedinUrl : '');
    setWebsiteUrl(typeof user.websiteUrl === 'string' ? user.websiteUrl : '');
    setIsPrivate(Boolean(user.isPrivate));
  }, [
    user,
    user?.id,
    user?.firstName,
    user?.lastName,
    user?.businessName,
    user?.businessOwner,
    user?.businessCategory,
    user?.nipt,
    user?.phone,
    user?.basedCityId,
    user?.shareThemeColor,
    user?.instagramUrl,
    user?.tiktokUrl,
    user?.linkedinUrl,
    user?.websiteUrl,
    user?.isPrivate,
  ]);

  React.useEffect(() => {
    return () => {
      if (privacyTimerRef.current) {
        clearTimeout(privacyTimerRef.current);
      }
    };
  }, []);

  const onTogglePrivacy = async (checked: boolean) => {
    if (!user || privacyBusy) return;
    setIsPrivate(checked);
    setPrivacyBusy(true);
    let succeeded = false;
    if (privacyTimerRef.current) {
      clearTimeout(privacyTimerRef.current);
      privacyTimerRef.current = null;
    }
    setPrivacyMsg(null);
    try {
      const { error } = await authClient.updatePortalProfile({ isPrivate: checked });
      if (error) {
        setPrivacyMsg({ type: 'error', text: error });
        setIsPrivate(!checked);
      } else {
        setPrivacyMsg({
          type: 'success',
          text: checked
            ? 'Profili u vendos privat (kartela fshihet nga njoftimet për publikun).'
            : 'Profili u vendos publik.',
        });
        succeeded = true;
        await checkSession();
      }
    } catch {
      setIsPrivate(!checked);
      setPrivacyMsg({ type: 'error', text: 'Nuk u arrit përditësimi i privatësisë.' });
    } finally {
      setPrivacyBusy(false);
      if (succeeded) {
        privacyTimerRef.current = setTimeout(() => {
          setPrivacyMsg(null);
          privacyTimerRef.current = null;
        }, 4000);
      }
    }
  };

  useOwnerEditHeaderActions(
    () => (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Fade in={Boolean(privacyMsg)} unmountOnExit>
          <Box
            sx={{
              position: { xs: 'absolute', sm: 'static' },
              top: { xs: 'calc(100% + 8px)', sm: 'auto' },
              right: { xs: 0, sm: 'auto' },
              zIndex: 1200,
              maxWidth: { xs: 'calc(100vw - 32px)', sm: 380, md: 440 },
              minWidth: { sm: 260 },
            }}
          >
            <Alert
              severity={privacyMsg?.type || 'success'}
              onClose={() => {
                if (privacyTimerRef.current) {
                  clearTimeout(privacyTimerRef.current);
                  privacyTimerRef.current = null;
                }
                setPrivacyMsg(null);
              }}
              sx={{
                py: 0.25,
                px: 1.25,
                borderRadius: 2,
                fontSize: '0.8rem',
                fontWeight: 600,
                alignItems: 'center',
                boxShadow: (t) =>
                  t.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
                '& .MuiAlert-icon': {
                  fontSize: 18,
                  mr: 1,
                  py: 0,
                },
                '& .MuiAlert-message': {
                  py: 0.25,
                },
                '& .MuiAlert-action': {
                  p: 0,
                  mr: -0.5,
                  alignItems: 'center',
                },
              }}
            >
              {privacyMsg?.text}
            </Alert>
          </Box>
        </Fade>

        <Tooltip
          title={
            isPrivate
              ? 'Profili është Privat: Kartela e profilit fshihet nga kartat e njoftimeve dhe faqja e profilit është e fshehur për të tjerët derisa t’ju kontaktojnë.'
              : 'Profili është Publik: Kartela e profilit dhe profili shfaqen publikisht.'
          }
          arrow
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              bgcolor: 'var(--mui-palette-background-paper, #18191b)',
              border: '1px solid',
              borderColor: isPrivate ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              py: 0.35,
              px: { xs: 1, sm: 1.5 },
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {isPrivate ? (
              <LockIcon size={16} weight="fill" color="#eab308" />
            ) : (
              <GlobeIcon size={16} weight="bold" color="#22c55e" />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.78rem',
                color: isPrivate ? '#eab308' : 'text.secondary',
                letterSpacing: '0.01em',
              }}
            >
              {isPrivate ? 'Privat' : 'Publik'}
            </Typography>
            <Switch
              size="small"
              checked={isPrivate}
              disabled={privacyBusy}
              onChange={(_, checked) => void onTogglePrivacy(checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#eab308',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#eab308',
                },
              }}
            />
          </Stack>
        </Tooltip>
      </Stack>
    ),
    [isPrivate, privacyBusy, user?.id, privacyMsg]
  );

  React.useEffect(() => {
    let cancelled = false;
    setCitiesLoading(true);
    void listRealEstateLocationsPublic().then((res) => {
      if (cancelled) return;
      setCitiesLoading(false);
      if (res.cities) setCities(res.cities);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!user?.id) {
      setReferralBadges([]);
      setReferralBadgesLoading(false);
      return;
    }
    let cancelled = false;
    setReferralBadgesLoading(true);
    void clientFetch<{ badges?: PublicMemberReferralBadge[] }>(`/public/members/${encodeURIComponent(user.id)}`).then(
      (res) => {
        if (cancelled) return;
        setReferralBadges(mergeMemberReferralBadges(res.ok ? res.data?.badges : null));
        setReferralBadgesLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!upgradeBusiness || isBusiness) return;
    const timer = window.setTimeout(() => {
      businessUpgradeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [upgradeBusiness, isBusiness]);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;
    setProfileMsg(null);
    const phone = phoneInput.trim();
    if (phone.length < 6) {
      setProfileMsg({ type: 'error', text: 'Numri i telefonit është i detyrueshëm.' });
      return;
    }
    setProfileSaving(true);
    try {
      const body = isBusiness
        ? {
            businessName: businessName.trim(),
            businessOwner: businessOwner.trim(),
            businessCategory: businessCategory.trim(),
            phone,
            basedCityId: basedCityId || null,
            shareThemeColor,
            instagramUrl,
            tiktokUrl,
            linkedinUrl,
            websiteUrl,
          }
        : {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone,
            basedCityId: basedCityId || null,
            shareThemeColor,
            instagramUrl,
            tiktokUrl,
            linkedinUrl,
            websiteUrl,
          };
      const { error, admin } = await authClient.updatePortalProfile(body);
      if (error) {
        setProfileMsg({ type: 'error', text: error });
        return;
      }
      const cityName =
        (typeof admin?.basedCityName === 'string' && admin.basedCityName.trim()) ||
        cities.find((c) => c.id === basedCityId)?.name ||
        '';
      if (basedCityId) {
        rememberListingLocation({ cityId: basedCityId, cityName }, user.id);
      }
      setProfileMsg({ type: 'success', text: 'Profili u ruajt.' });
      await checkSession();
    } finally {
      setProfileSaving(false);
    }
  };

  const onConvertToBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBusiness || !canEdit) return;
    setConvertMsg(null);
    setConvertSaving(true);
    try {
      const { error } = await authClient.convertToBusinessAccount({
        nipt: niptInput.trim(),
        businessName: businessName.trim(),
        businessOwner: businessOwner.trim(),
        businessCategory: businessCategory.trim(),
        phone: phoneInput.trim(),
      });
      if (error) {
        setConvertMsg({ type: 'error', text: error });
        return;
      }
      setConvertMsg({ type: 'success', text: 'Llogaria u kthye në llogari biznesi.' });
      await checkSession();
    } finally {
      setConvertSaving(false);
    }
  };

  const onPickAvatar = () => {
    if (avatarBusy || !canEdit) return;
    fileInputRef.current?.click();
  };

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canEdit) return;

    setAvatarMsg(null);
    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      setAvatarMsg({ type: 'error', text: 'Lejohen vetëm foto JPEG, PNG, WEBP ose GIF.' });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarMsg({ type: 'error', text: 'Foto duhet të jetë nën 8 MB.' });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setAvatarBusy(true);
    try {
      const { error, avatar } = await authClient.uploadPortalAvatar(file);
      if (error || !avatar) {
        setAvatarPreview(null);
        setAvatarMsg({ type: 'error', text: error || 'Nuk u arrit ngarkimi i fotos.' });
        return;
      }
      setAvatarPreview(avatar);
      setAvatarMsg({ type: 'success', text: 'Foto e profilit u përditësua.' });
      await checkSession();
    } finally {
      setAvatarBusy(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const onRemoveAvatar = async () => {
    if (avatarBusy || !canEdit) return;
    const hasAvatar = Boolean(avatarPreview || (typeof user?.avatar === 'string' && user.avatar.trim()));
    if (!hasAvatar) return;
    setAvatarMsg(null);
    setAvatarBusy(true);
    try {
      const { error } = await authClient.removePortalAvatar();
      if (error) {
        setAvatarMsg({ type: 'error', text: error });
        return;
      }
      setAvatarPreview(null);
      setAvatarMsg({ type: 'success', text: 'Foto e profilit u hoq.' });
      await checkSession();
    } finally {
      setAvatarBusy(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Fjalëkalimet e reja nuk përputhen.' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await authClient.changePortalPassword({
        currentPassword,
        newPassword,
      });
      if (error) {
        setPasswordMsg({ type: 'error', text: error });
        return;
      }
      setPasswordMsg({ type: 'success', text: 'Fjalëkalimi u ndryshua.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  const displayName = publicDisplayName(user);
  const initials = memberInitials(displayName);
  const publicHref = user.id ? pathsPublicMemberProfile(user.id) : null;
  const avatarSrc =
    avatarPreview || (typeof user.avatar === 'string' && user.avatar.trim() ? user.avatar.trim() : undefined);
  const businessCategoryLabel = isBusiness ? String(user.businessCategory || '').trim() : '';

  return (
    <Stack
      spacing={2}
      sx={{
        maxWidth: 640,
        mx: 'auto',
        width: '100%',
        // Match SearchableSelect (“Ku jeni bazuar”) rounded corners
        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
      }}
    >
      {/* Identity preview — same public profile visitors see */}
      <PortalSurface>
        <Stack
          spacing={1.75}
          sx={{
            alignItems: 'center',
            textAlign: 'center',
            px: { xs: 2.25, sm: 3 },
            py: { xs: 2.5, sm: 3 },
          }}
        >
          <Box sx={{ position: 'relative', width: 'fit-content' }}>
            <Avatar
              src={avatarSrc}
              alt={displayName}
              sx={{
                width: 84,
                height: 84,
                bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.14),
                color: 'primary.main',
                fontWeight: 800,
                fontSize: '1.65rem',
                border: '2px solid',
                borderColor: 'divider',
              }}
            >
              {initials}
            </Avatar>
            {canEdit ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_ACCEPT}
                  hidden
                  onChange={(ev) => void onAvatarSelected(ev)}
                />
                <IconButton
                  aria-label={avatarSrc ? 'Ndrysho foton' : 'Shto foto'}
                  onClick={onPickAvatar}
                  disabled={avatarBusy}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: -4,
                    bottom: -4,
                    width: 30,
                    height: 30,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    border: '2px solid',
                    borderColor: 'background.paper',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      opacity: 0.7,
                    },
                  }}
                >
                  {avatarBusy ? <CircularProgress size={13} color="inherit" /> : <CameraIcon size={15} weight="bold" />}
                </IconButton>
              </>
            ) : null}
          </Box>

          <Stack spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '100%' }}
            >
              <Typography
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.35rem', sm: '1.5rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {displayName}
                {user.verified ? (
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                  >
                    <ListingVerifiedBadge size={22} aria-label="Llogaria e verifikuar" />
                  </Box>
                ) : null}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}
            >
              <Chip
                size="small"
                icon={isBusiness ? <BuildingsIcon size={13} weight="fill" /> : <UserIcon size={13} weight="fill" />}
                label={isBusiness ? 'Biznes' : 'Individ'}
                sx={{
                  height: 26,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.14 : 0.1),
                  color: 'primary.main',
                  border: 'none',
                  '& .MuiChip-icon': { color: 'inherit', ml: 0.65 },
                }}
              />
              {user.verified ? (
                <Chip
                  size="small"
                  icon={<ShieldCheckIcon size={13} weight="fill" />}
                  label="Ky profil është i verifikuar"
                  sx={{
                    height: 26,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    bgcolor: 'rgba(var(--mui-palette-success-mainChannel) / 0.14)',
                    border: '1px solid',
                    borderColor: 'rgba(var(--mui-palette-success-mainChannel) / 0.45)',
                    color: 'success.main',
                    '& .MuiChip-icon': { color: 'success.main', ml: 0.65 },
                  }}
                />
              ) : null}
              {businessCategoryLabel ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {businessCategoryLabel}
                </Typography>
              ) : null}
            </Stack>

            {referralBadgesLoading ? (
              <MemberReferralBadgesSkeleton dense columns={5} count={5} />
            ) : referralBadges.length > 0 ? (
              <Box sx={{ width: '100%', pt: 0.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontWeight: 700, mb: 1, textAlign: 'center' }}
                >
                  Badges
                </Typography>
                <MemberReferralBadgesRow badges={referralBadges} dense layout="grid" columns={5} selfView />
              </Box>
            ) : null}
          </Stack>

          {avatarMsg ? (
            avatarMsg.type === 'success' ? (
              <TransientSuccessAlert
                message={avatarMsg.text}
                onDismiss={() => setAvatarMsg(null)}
                sx={{ width: '100%', textAlign: 'left' }}
              />
            ) : (
              <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                {avatarMsg.text}
              </Alert>
            )
          ) : null}

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            {publicHref ? (
              <Button
                component={RouterLink}
                href={publicHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
                endIcon={<ArrowSquareOutIcon size={15} weight="bold" />}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 1.5 }}
              >
                Shiko profilin publik
              </Button>
            ) : null}
            {canEdit && avatarSrc ? (
              <Button
                variant="text"
                size="small"
                color="inherit"
                disabled={avatarBusy}
                startIcon={<TrashIcon size={14} />}
                onClick={() => void onRemoveAvatar()}
                sx={{ fontWeight: 650, textTransform: 'none', color: 'text.secondary' }}
              >
                Hiq foton
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </PortalSurface>

      {/* Editable public fields — business & individual share this page */}
      {canEdit ? (
        <PortalSectionCard
          title="Të dhënat e profilit"
          description={
            isBusiness
              ? 'Emri, kategoria dhe kontakti që shfaqen në profilin publik të biznesit.'
              : 'Emri dhe kontakti që shfaqen në profilin tuaj publik.'
          }
          icon={<UserIcon size={22} weight="duotone" />}
        >
          <Box component="form" onSubmit={(e) => void onSaveProfile(e)}>
            <Stack spacing={2}>
              {profileMsg?.type === 'success' ? (
                <TransientSuccessAlert message={profileMsg.text} onDismiss={() => setProfileMsg(null)} />
              ) : profileMsg ? (
                <Alert severity="error">{profileMsg.text}</Alert>
              ) : null}

              {isBusiness ? (
                <>
                  <TextField
                    label="Emri i biznesit"
                    value={businessName}
                    onChange={(ev) => setBusinessName(ev.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Pronari"
                    value={businessOwner}
                    onChange={(ev) => setBusinessOwner(ev.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Kategoria"
                    value={businessCategory}
                    onChange={(ev) => setBusinessCategory(ev.target.value)}
                    fullWidth
                    placeholder="p.sh. Restorant, Shërbime…"
                  />
                  {String(user.nipt ?? '').trim() ? (
                    <LockedIdentityField
                      label="NIPT"
                      value={String(user.nipt)}
                      fieldKind="nipt"
                      userEmail={user.email}
                    />
                  ) : null}
                </>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Emri"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Mbiemri"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    required
                    fullWidth
                  />
                </Stack>
              )}

              <TextField
                label="Email"
                value={user.email}
                fullWidth
                disabled
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', color: 'text.secondary' }}>
                        <EnvelopeIcon size={18} />
                      </Box>
                    ),
                  },
                }}
              />

              <TextField
                label="Telefoni"
                type="tel"
                value={phoneInput}
                onChange={(ev) => setPhoneInput(ev.target.value)}
                required
                fullWidth
                autoComplete="tel"
                slotProps={{ htmlInput: { maxLength: 40 } }}
              />

              <SearchableSelect
                label="Ku jeni bazuar"
                value={basedCityId}
                onChange={setBasedCityId}
                options={cities.map((c) => ({ value: c.id, label: c.name }))}
                emptyLabel="Zgjidhni qytetin…"
                clearable
                disabled={citiesLoading || cities.length === 0}
              />

              <ShareThemeColorPicker value={shareThemeColor} onChange={setShareThemeColor} />

              <Box
                sx={{
                  pt: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Rrjetet sociale
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shtoni lidhjet që dëshironi të shfaqni në banner-in e profilit publik.
                    </Typography>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Instagram"
                      placeholder="https://instagram.com/…"
                      value={instagramUrl}
                      onChange={(ev) => setInstagramUrl(ev.target.value)}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Box sx={{ mr: 1, display: 'flex', color: '#e1306c' }}>
                              <InstagramLogoIcon size={18} weight="fill" />
                            </Box>
                          ),
                        },
                      }}
                    />
                    <TextField
                      label="TikTok"
                      placeholder="https://tiktok.com/@…"
                      value={tiktokUrl}
                      onChange={(ev) => setTiktokUrl(ev.target.value)}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Box sx={{ mr: 1, display: 'flex', color: 'text.primary' }}>
                              <TiktokLogoIcon size={18} weight="fill" />
                            </Box>
                          ),
                        },
                      }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="LinkedIn"
                      placeholder="https://linkedin.com/in/…"
                      value={linkedinUrl}
                      onChange={(ev) => setLinkedinUrl(ev.target.value)}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Box sx={{ mr: 1, display: 'flex', color: '#0a66c2' }}>
                              <LinkedinLogoIcon size={18} weight="fill" />
                            </Box>
                          ),
                        },
                      }}
                    />
                    <TextField
                      label="Website"
                      placeholder="https://shembull.al"
                      value={websiteUrl}
                      onChange={(ev) => setWebsiteUrl(ev.target.value)}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Box sx={{ mr: 1, display: 'flex', color: 'primary.main' }}>
                              <GlobeIcon size={18} weight="bold" />
                            </Box>
                          ),
                        },
                      }}
                    />
                  </Stack>
                </Stack>
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={profileSaving}
                sx={{ alignSelf: 'flex-start', fontWeight: 800, borderRadius: 2.5, px: 2.5 }}
              >
                {profileSaving ? 'Duke ruajtur…' : 'Ruaj profilin'}
              </Button>
            </Stack>
          </Box>
        </PortalSectionCard>
      ) : null}

      {/* Upgrade path for individuals who want a business account */}
      {canEdit && !isBusiness ? (
        <Box ref={businessUpgradeRef} id="upgrade-business">
          <PortalSectionCard
            title="Kthehu në llogari biznesi"
            description="Për të postuar në kategorinë Biznese dhe për të menaxhuar profilin e lokalit."
            icon={<BuildingsIcon size={22} weight="duotone" />}
          >
            <Box component="form" onSubmit={(e) => void onConvertToBusiness(e)}>
              <Stack spacing={2}>
                {upgradeBusiness ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Plotësoni fushat më poshtë për të krijuar llogarinë e biznesit.
                  </Alert>
                ) : null}
                {convertMsg?.type === 'success' ? (
                  <TransientSuccessAlert message={convertMsg.text} onDismiss={() => setConvertMsg(null)} />
                ) : convertMsg ? (
                  <Alert severity="error">{convertMsg.text}</Alert>
                ) : null}
                <TextField
                  label="NIPT"
                  value={niptInput}
                  onChange={(ev) => setNiptInput(ev.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Emri i biznesit"
                  value={businessName}
                  onChange={(ev) => setBusinessName(ev.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Pronari"
                  value={businessOwner}
                  onChange={(ev) => setBusinessOwner(ev.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Kategoria"
                  value={businessCategory}
                  onChange={(ev) => setBusinessCategory(ev.target.value)}
                  required
                  fullWidth
                  placeholder="p.sh. Restorant, Shërbime…"
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={convertSaving}
                  sx={{ alignSelf: 'flex-start', fontWeight: 800, borderRadius: 2.5, px: 2.5 }}
                >
                  {convertSaving ? 'Duke konvertuar…' : 'Kompleto profilin e biznesit'}
                </Button>
              </Stack>
            </Box>
          </PortalSectionCard>
        </Box>
      ) : null}

      {canEdit ? (
        <PortalSectionCard
          title="Verifiko llogarinë"
          description="Opsionale — nuk ndryshon llojin e llogarisë (Biznes / Individ)."
          icon={<ShieldCheckIcon size={22} weight="duotone" />}
        >
          <AccountVerificationCard />
        </PortalSectionCard>
      ) : null}

      <PortalSectionCard
        title="Fjalëkalimi"
        description="Ndryshoni fjalëkalimin e llogarisë."
        icon={<LockIcon size={22} weight="duotone" />}
      >
        <Box component="form" onSubmit={(e) => void onChangePassword(e)}>
          <Stack spacing={2} sx={{ maxWidth: 440 }}>
            {passwordMsg?.type === 'success' ? (
              <TransientSuccessAlert message={passwordMsg.text} onDismiss={() => setPasswordMsg(null)} />
            ) : passwordMsg ? (
              <Alert severity="error">{passwordMsg.text}</Alert>
            ) : null}
            <TextField
              label="Fjalëkalimi aktual"
              type="password"
              value={currentPassword}
              onChange={(ev) => setCurrentPassword(ev.target.value)}
              fullWidth
              required
              autoComplete="current-password"
            />
            <TextField
              label="Fjalëkalimi i ri"
              type="password"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              fullWidth
              required
              autoComplete="new-password"
            />
            <TextField
              label="Përsërit fjalëkalimin e ri"
              type="password"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              fullWidth
              required
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              disabled={savingPassword}
              sx={{ alignSelf: 'flex-start', fontWeight: 800, borderRadius: 2.5 }}
            >
              {savingPassword ? 'Duke u përditësuar…' : 'Ndrysho fjalëkalimin'}
            </Button>
          </Stack>
        </Box>
      </PortalSectionCard>
    </Stack>
  );
}

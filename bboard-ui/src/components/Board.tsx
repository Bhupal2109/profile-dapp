// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Stack,
  Button,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import EditIcon from '@mui/icons-material/EditNoteOutlined';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import { type BBoardDerivedState, type DeployedBBoardAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { State } from '../../../contract/src/index';
import { EmptyCardContent } from './Board.EmptyCardContent';

/** The props required by the {@link Board} component. */
export interface BoardProps {
  /** The observable bulletin board deployment. */
  boardDeployment$?: Observable<BoardDeployment>;
}

/**
 * Provides the UI for a deployed bulletin board contract; allowing messages to be posted or removed
 * following the rules enforced by the underlying Compact contract.
 *
 * @remarks
 * With no `boardDeployment$` observable, the component will render a UI that allows the user to create
 * or join bulletin boards. It requires a `<DeployedBoardProvider />` to be in scope in order to manage
 * these additional boards. It does this by invoking the `resolve(...)` method on the currently in-
 * scope `DeployedBoardContext`.
 *
 * When a `boardDeployment$` observable is received, the component begins by rendering a skeletal view of
 * itself, along with a loading background. It does this until the board deployment receives a
 * `DeployedBBoardAPI` instance, upon which it will then subscribe to its `state$` observable in order
 * to start receiving the changes in the bulletin board state (i.e., when a user posts a new message).
 */
export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedBBoardAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<BBoardDerivedState>();
  const [nameInput, setNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);

  // Two simple callbacks that call `resolve(...)` to either deploy or join a bulletin board
  // contract. Since the `DeployedBoardContext` will create a new board and update the UI, we
  // don't have to do anything further once we've called `resolve`.
  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  const onSaveProfile = useCallback(async () => {
    if (!nameInput.trim() || !bioInput.trim()) {
      setErrorMessage('Name and bio are required.');
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        if (boardState?.state === State.LIVE) {
          await deployedBoardAPI.updateProfile(nameInput.trim(), bioInput.trim());
        } else {
          await deployedBoardAPI.setProfile(nameInput.trim(), bioInput.trim());
        }
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [bioInput, boardState?.state, deployedBoardAPI, nameInput]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  // Subscribes to the `boardDeployment$` observable so that we can receive updates on the deployment.
  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }

    const subscription = boardDeployment$.subscribe(setBoardDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  // Subscribes to the `state$` observable on a `DeployedBBoardAPI` if we receive one, allowing the
  // component to receive updates to the change in contract state; otherwise we update the UI to
  // reflect the error was received instead.
  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    // We need the board API as well as subscribing to its `state$` observable, so that we can invoke
    // the `post` and `takeDown` methods later.
    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe((state) => {
      setBoardState(state);
      setNameInput(state.profileName ?? '');
      setBioInput(state.profileBio ?? '');
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment, setIsWorking, setErrorMessage, setDeployedBoardAPI]);

  return (
    <Card sx={{ position: 'relative', width: 360, minWidth: 360, minHeight: 420 }} color="primary">
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="board-working-indicator" />
          </Backdrop>
          <Backdrop
            sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={!!errorMessage}
          >
            <StopIcon fontSize="large" />
            <Typography component="div" data-testid="board-error-message">
              {errorMessage}
            </Typography>
          </Backdrop>
          <CardHeader
            avatar={
              boardState ? (
                boardState.isOwner ? (
                  <LockOpenIcon data-testid="profile-owned-icon" />
                ) : (
                  <LockIcon data-testid="profile-locked-icon" />
                )
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
            titleTypographyProps={{ color: 'primary' }}
            title={deployedBoardAPI?.deployedContractAddress ? 'Profile contract' : 'Preparing profile'}
            subheader={toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? 'Loading...'}
          />
          <CardContent>
            {boardState ? (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="primary">Profile status</Typography>
                <TextField
                  label="Name"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Bio"
                  value={bioInput}
                  onChange={(event) => setBioInput(event.target.value)}
                  fullWidth
                  multiline
                  minRows={4}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {boardState.state === State.LIVE ? 'Your profile is live on-chain.' : 'Create the first profile entry.'}
                </Typography>
              </Stack>
            ) : (
              <Skeleton variant="rectangular" width={320} height={220} />
            )}
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            {deployedBoardAPI ? (
              <React.Fragment>
                <Button
                  data-testid="board-save-profile-btn"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={onSaveProfile}
                  disabled={!nameInput.trim() || !bioInput.trim() || !deployedBoardAPI}
                >
                  {boardState?.state === State.LIVE ? 'Update profile' : 'Create profile'}
                </Button>
                <IconButton title="Copy contract address" onClick={onCopyContractAddress}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </React.Fragment>
            ) : (
              <Skeleton variant="rectangular" width={120} height={36} />
            )}
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

/** @internal */
const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement | undefined =>
  // Returns a new string made up of the first, and last, 8 characters of a given contract address.
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;
